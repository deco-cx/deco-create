/**
 * Hooks for managing app preferences using DeconfigResource.
 * 
 * This provides a global, persistent way to store app state like
 * the currently selected theme. Uses SSE for real-time sync across
 * all clients.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { client } from "../lib/rpc";
import type { TodoSetting } from "./useTodoSettings";

const PREFERENCES_KEY = "app-preferences";

/**
 * Hook to get and watch app preferences with SSE
 */
export const useAppPreferences = () => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch app preferences - only this data, isolated from themes
  const { data, isLoading } = useQuery({
    queryKey: ["appPreferences"],
    queryFn: async () => {
      const result = await client.DECO_RESOURCE_APP_PREFERENCES_SEARCH({
        pageSize: 10,
      });

      // Only fetch if items exist
      if (result.items.length === 0) {
        return [];
      }

      // Fetch full data for each preference
      const fullPreferences = await Promise.all(
        result.items.map(async (item) => {
          const fullData = await client.DECO_RESOURCE_APP_PREFERENCES_READ({
            uri: item.uri,
          });
          return fullData;
        })
      );

      return fullPreferences;
    },
    staleTime: Infinity, // Preferences never stale - SSE will update
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Get watch endpoint pathname and subscribe to SSE updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let debounceTimer: NodeJS.Timeout;

    const setupSSE = async () => {
      try {
        // Get the watch endpoint pathname and URI template from DESCRIBE
        const description = await client.DECO_RESOURCE_APP_PREFERENCES_DESCRIBE({});
        const watchPathname = description.features?.watch?.pathname;
        const uriTemplate = description.uriTemplate;
        
        if (!watchPathname || !uriTemplate) {
          console.error("No watch pathname or uriTemplate found for AppPreferences");
          return;
        }

        // Construct SSE URL with URI template query parameter
        // Using the template as-is (with *) subscribes to ALL resources of this type
        const watchUrl = `${watchPathname}?uri=${encodeURIComponent(uriTemplate)}`;
        console.log("AppPreferences watch URL:", watchUrl);

        // Connect to SSE endpoint
        eventSource = new EventSource(watchUrl);

        eventSource.onopen = () => {
          console.log("AppPreferences SSE connection established");
          setIsConnected(true);
        };

        eventSource.onmessage = async (event) => {
          console.log("AppPreferences SSE event:", event.data);
          try {
            const update = JSON.parse(event.data);
            console.log("Parsed AppPreferences update:", update);

            // SSE now only sends URI, we need to fetch the data
            if (update.uri) {
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(async () => {
                try {
                  // Fetch the updated resource data
                  const resource = await client.DECO_RESOURCE_APP_PREFERENCES_READ({
                    uri: update.uri
                  });
                  console.log("Fetched AppPreferences resource:", resource);

                  // Update cache with fetched data
                  queryClient.setQueryData(["appPreferences"], (old: any) => {
                    if (!old || !Array.isArray(old)) return [resource];

                    // Find and update the matching resource by URI
                    const index = old.findIndex((item: any) => item.uri === update.uri);
                    if (index >= 0) {
                      const updated = [...old];
                      updated[index] = resource;
                      return updated;
                    }
                    // If not found, add it
                    return [...old, resource];
                  });
                } catch (error) {
                  console.error("Failed to fetch AppPreferences resource:", error);
                }
              }, 300); // Debounce to avoid rapid-fire fetches
            }
          } catch (error) {
            console.error("Failed to parse AppPreferences SSE event:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("AppPreferences SSE error:", error);
          setIsConnected(false);
          // EventSource will automatically reconnect
        };
      } catch (error) {
        console.error("Failed to setup AppPreferences SSE:", error);
      }
    };

    setupSSE();

    return () => {
      console.log("Closing AppPreferences SSE connection");
      clearTimeout(debounceTimer);
      eventSource?.close();
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only create connection once on mount

  // Get or create the main preferences object
  const preferences = data?.[0];

  return {
    preferences,
    isLoading,
    isConnected,
  };
};

/**
 * Hook to set the selected theme with optimistic updates
 */
export const useSetSelectedTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (themeUri: string | undefined) => {
      // Get cached preferences instead of fetching again
      const cachedPreferences = queryClient.getQueryData(["appPreferences"]) as any[];

      if (cachedPreferences && cachedPreferences.length > 0) {
        // Use cached data - only 1 network call (UPDATE)
        const existing = cachedPreferences[0];

        return await client.DECO_RESOURCE_APP_PREFERENCES_UPDATE({
          uri: existing.uri,
          data: {
            ...existing.data,
            selectedThemeUri: themeUri,
          },
        });
      } else {
        // Create new preference if none exist
        return await client.DECO_RESOURCE_APP_PREFERENCES_CREATE({
          data: {
            name: PREFERENCES_KEY,
            description: "Global app preferences",
            selectedThemeUri: themeUri,
          },
        });
      }
    },
    // Optimistic update - update UI immediately
    onMutate: async (newThemeUri) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["appPreferences"] });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData(["appPreferences"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["appPreferences"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;

        // Update the first preference with the new theme URI
        if (old.length > 0) {
          return [
            {
              ...old[0],
              data: {
                ...old[0].data,
                selectedThemeUri: newThemeUri,
              },
            },
            ...old.slice(1),
          ];
        }
        return old;
      });

      // Return context with the previous value
      return { previousPreferences };
    },
    // On error, rollback to the previous value and refetch
    onError: (err, _newThemeUri, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(["appPreferences"], context.previousPreferences);
      }
      console.error("Failed to set theme:", err);
      // Refetch to sync with server state
      queryClient.invalidateQueries({ queryKey: ["appPreferences"] });
    },
    // On success, do nothing - SSE will sync the state
    onSuccess: () => {
      // No invalidation needed - SSE will handle it
    },
  });
};

/**
 * Combined hook that provides the selected theme and setter
 */
export const useSelectedTheme = (allThemes: TodoSetting[] | undefined) => {
  const { preferences } = useAppPreferences();
  const setThemeMutation = useSetSelectedTheme();

  // Find the currently selected theme
  const selectedTheme = allThemes?.find(
    (theme) => theme.uri === preferences?.data.selectedThemeUri
  );

  // Get colors from selected theme or defaults
  const DEFAULT_COLORS = {
    cardColor: "#1e293b",
    completedColor: "#334155",
    textColor: "#e2e8f0",
  };

  const colors = selectedTheme
    ? {
      cardColor: selectedTheme.data.cardColor,
      completedColor: selectedTheme.data.completedColor,
      textColor: selectedTheme.data.textColor,
    }
    : DEFAULT_COLORS;

  return {
    selectedTheme,
    setSelectedTheme: (theme: TodoSetting | undefined) => {
      setThemeMutation.mutate(theme?.uri);
    },
    colors,
    isSettingTheme: setThemeMutation.isPending,
  };
};

