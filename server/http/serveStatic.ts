import { getMimeType } from "./mime";
import type { ReadStream, Stats } from "node:fs";
import { createReadStream, lstatSync, existsSync } from "node:fs";
import { join } from "node:path";

export type ServeStaticOptions<E extends Env = Env> = {
  /**
   * Root path, relative to current working directory from which the app was started. Absolute paths are not supported.
   */
  root?: string;
  path?: string;
  index?: string; // default is 'index.html'
  precompressed?: boolean;
  rewriteRequestPath?: (path: string, c: Context<E>) => string;
  onNotFound?: (req: Request, env: unknown) => Promise<Response> | Response;
};

const COMPRESSIBLE_CONTENT_TYPE_REGEX =
  /^\s*(?:text\/[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;
const ENCODINGS = {
  br: ".br",
  zstd: ".zst",
  gzip: ".gz",
} as const;
const ENCODINGS_ORDERED_KEYS = Object.keys(
  ENCODINGS,
) as (keyof typeof ENCODINGS)[];

const createStreamBody = (stream: ReadStream) => {
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      stream.on("error", (err) => {
        controller.error(err);
      });
      stream.on("end", () => {
        controller.close();
      });
    },

    cancel() {
      stream.destroy();
    },
  });
  return body;
};

const getStats = (path: string) => {
  let stats: Stats | undefined;
  try {
    stats = lstatSync(path);
  } catch {}
  return stats;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serveStatic = <E extends Env = any>(
  options: ServeStaticOptions<E> = { root: "" },
): MiddlewareHandler<E> => {
  const root = options.root || "";
  const optionPath = options.path;

  const onNotFound =
    options.onNotFound ||
    (() => {
      return new Response("Not Found", { status: 404 });
    });

  if (root !== "" && !existsSync(root)) {
    console.error(
      `serveStatic: root path '${root}' is not found, are you sure it's correct?`,
    );
  }

  return async (req: Request, env: unknown): Promise<Response> => {
    console.log(env);
    const url = new URL(req.url);
    let filename: string;

    if (optionPath) {
      filename = optionPath;
    } else {
      try {
        filename = decodeURIComponent(url.pathname);
        if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
          throw new Error();
        }
      } catch {
        return await onNotFound(req, env);
      }
    }

    let path = join(
      root,
      !optionPath && options.rewriteRequestPath
        ? options.rewriteRequestPath(filename, c)
        : filename,
    );

    let stats = getStats(path);

    if (stats && stats.isDirectory()) {
      const indexFile = options.index ?? "index.html";
      path = join(path, indexFile);
      stats = getStats(path);
    }

    if (!stats) {
      return await onNotFound(req, env);
    }

    const mimeType = getMimeType(path);
    const headers = new Headers();

    headers.set("Content-Type", mimeType || "application/octet-stream");

    if (
      options.precompressed &&
      (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))
    ) {
      const acceptEncodingSet = new Set(
        req.headers
          .get("Accept-Encoding")
          ?.split(",")
          .map((encoding) => encoding.trim()),
      );

      for (const encoding of ENCODINGS_ORDERED_KEYS) {
        if (!acceptEncodingSet.has(encoding)) {
          continue;
        }
        const precompressedStats = getStats(path + ENCODINGS[encoding]);
        if (precompressedStats) {
          headers.set("Content-Encoding", encoding);
          headers.append("Vary", "Accept-Encoding");
          stats = precompressedStats;
          path = path + ENCODINGS[encoding];
          break;
        }
      }
    }

    const size = stats.size;

    if (req.method == "HEAD" || req.method == "OPTIONS") {
      headers.set("Content-Length", size.toString());
      return new Response(null, { headers, status: 200 });
    }

    const range = req.headers.get("range") || "";

    if (!range) {
      headers.set("Content-Length", size.toString());
      const stream = createReadStream(path);
      return new Response(createStreamBody(stream), { headers, status: 200 });
    }

    headers.set("Accept-Ranges", "bytes");
    headers.set("Date", stats.birthtime.toUTCString());

    const parts = range.replace(/bytes=/, "").split("-", 2);
    const start = parseInt(parts[0], 10) || 0;
    let end = parseInt(parts[1], 10) || size - 1;
    if (size < end - start + 1) {
      end = size - 1;
    }

    const chunksize = end - start + 1;
    const stream = createReadStream(path, { start, end });

    headers.set("Content-Length", chunksize.toString());
    headers.set("Content-Range", `bytes ${start}-${end}/${stats.size}`);

    return new Response(createStreamBody(stream), { headers, status: 206 });
  };
};
