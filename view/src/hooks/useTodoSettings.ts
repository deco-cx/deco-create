/**
 * React hooks for managing TODO card settings/themes using DeconfigResource
 * with real-time SSE updates.
 * 
 * Features:
 * - Fetch all TODO theme settings
 * - Create, update, and delete theme settings
 * - Real-time updates via Server-Sent Events (SSE)
 * - Automatic cache invalidation on changes
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { client } from "../lib/rpc";

// Type for a TODO setting (theme)
export interface TodoSetting {
  uri: string;
  data: {
    name: string;
    description: string;
    cardColor: string;
    completedColor: string;
    textColor: string;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook to fetch and watch TODO settings with real-time SSE updates
 */
export const useTodoSettings = () => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial settings list and then fetch full data for each
  const { data, isLoading, error } = useQuery({
    queryKey: ["todoSettings"],
    queryFn: async () => {
      // First, search to get the list of URIs
      const searchResult = await client.DECO_RESOURCE_TODO_SETTINGS_SEARCH({
        pageSize: 100,
      });
      
      // Then fetch full data for each resource
      const fullSettings = await Promise.all(
        searchResult.items.map(async (item) => {
          const fullData = await client.DECO_RESOURCE_TODO_SETTINGS_READ({
            uri: item.uri,
          });
          return fullData;
        })
      );
      
      return {
        ...searchResult,
        items: fullSettings,
      };
    },
    staleTime: Infinity, // Themes never stale - SSE will update when they change
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
        const description = await client.DECO_RESOURCE_TODO_SETTINGS_DESCRIBE({});
        const watchPathname = description.features?.watch?.pathname;
        const uriTemplate = description.uriTemplate;
        
        if (!watchPathname || !uriTemplate) {
          console.error("No watch pathname or uriTemplate found for TodoSettings");
          return;
        }

        // Construct SSE URL with URI template query parameter
        // Using the template as-is (with *) subscribes to ALL resources of this type
        const watchUrl = `${watchPathname}?uri=${encodeURIComponent(uriTemplate)}`;
        console.log("TodoSettings watch URL:", watchUrl);

        // Connect to SSE endpoint
        eventSource = new EventSource(watchUrl);

        eventSource.onopen = () => {
          console.log("TodoSettings SSE connection established");
          setIsConnected(true);
        };

        eventSource.onmessage = async (event) => {
          console.log("TodoSettings SSE event received:", event.data);
          try {
            const update = JSON.parse(event.data);
            console.log("Parsed TodoSettings SSE update:", update);

            // SSE now only sends URI, we need to fetch the data
            if (update.uri) {
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(async () => {
                try {
                  // Fetch the updated resource data
                  const resource = await client.DECO_RESOURCE_TODO_SETTINGS_READ({ 
                    uri: update.uri 
                  });
                  console.log("Fetched TodoSettings resource:", resource);

                  // Update cache with fetched data
                  queryClient.setQueryData(["todoSettings"], (old: any) => {
                    if (!old) return { items: [resource] };
                    
                    const items = old.items || [];
                    const index = items.findIndex((item: any) => item.uri === update.uri);
                    
                    if (index >= 0) {
                      const updated = [...items];
                      updated[index] = resource;
                      return { ...old, items: updated };
                    }
                    // If not found, add it
                    return { ...old, items: [...items, resource] };
                  });
                } catch (error) {
                  console.error("Failed to fetch TodoSettings resource:", error);
                }
              }, 300); // Debounce to avoid rapid-fire fetches
            }
          } catch (error) {
            console.error("Failed to parse TodoSettings SSE event:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("TodoSettings SSE connection error:", error);
          setIsConnected(false);
          // EventSource will automatically reconnect
        };
      } catch (error) {
        console.error("Failed to setup TodoSettings SSE:", error);
      }
    };

    setupSSE();

    return () => {
      console.log("Closing TodoSettings SSE connection");
      clearTimeout(debounceTimer);
      eventSource?.close();
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only create connection once on mount

  return {
    settings: data?.items as TodoSetting[] | undefined,
    totalCount: data?.totalCount,
    isLoading,
    error,
    isConnected,
  };
};

/**
 * Hook to create a new TODO theme setting with optimistic updates
 */
export const useCreateTodoSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      cardColor: string;
      completedColor: string;
      textColor: string;
    }) =>
      client.DECO_RESOURCE_TODO_SETTINGS_CREATE({
        data,
      }),
    // Optimistic update
    onMutate: async (newSetting) => {
      await queryClient.cancelQueries({ queryKey: ["todoSettings"] });
      
      const previousSettings = queryClient.getQueryData(["todoSettings"]);
      
      // Optimistically add the new setting with a temporary URI
      queryClient.setQueryData(["todoSettings"], (old: any) => {
        if (!old) return old;
        
        const tempSetting: TodoSetting = {
          uri: `temp-${Date.now()}`,
          data: newSetting,
        };
        
        return {
          ...old,
          items: [...(old.items || []), tempSetting],
          totalCount: (old.totalCount || 0) + 1,
        };
      });
      
      return { previousSettings };
    },
    onError: (err, _newSetting, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["todoSettings"], context.previousSettings);
      }
      console.error("Failed to create theme:", err);
      // Refetch only on error
      queryClient.invalidateQueries({ queryKey: ["todoSettings"] });
    },
    onSuccess: () => {
      // No invalidation needed - SSE will handle it
    },
  });
};

/**
 * Hook to update an existing TODO theme setting
 */
export const useUpdateTodoSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uri,
      data,
    }: {
      uri: string;
      data: {
        name: string;
        description: string;
        cardColor: string;
        completedColor: string;
        textColor: string;
      };
    }) =>
      client.DECO_RESOURCE_TODO_SETTINGS_UPDATE({
        uri,
        data,
      }),
    onError: (err) => {
      console.error("Failed to update theme:", err);
      // Refetch only on error
      queryClient.invalidateQueries({ queryKey: ["todoSettings"] });
    },
    onSuccess: () => {
      // No invalidation needed - SSE will handle it
    },
  });
};

/**
 * Hook to delete a TODO theme setting with optimistic updates
 */
export const useDeleteTodoSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uri: string) =>
      client.DECO_RESOURCE_TODO_SETTINGS_DELETE({
        uri,
      }),
    // Optimistic update
    onMutate: async (uriToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["todoSettings"] });
      
      const previousSettings = queryClient.getQueryData(["todoSettings"]);
      
      // Optimistically remove the setting
      queryClient.setQueryData(["todoSettings"], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          items: (old.items || []).filter((item: TodoSetting) => item.uri !== uriToDelete),
          totalCount: Math.max(0, (old.totalCount || 0) - 1),
        };
      });
      
      return { previousSettings };
    },
    onError: (err, _uriToDelete, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["todoSettings"], context.previousSettings);
      }
      console.error("Failed to delete theme:", err);
      // Refetch only on error
      queryClient.invalidateQueries({ queryKey: ["todoSettings"] });
    },
    onSuccess: () => {
      // No invalidation needed - SSE will handle it
    },
  });
};

