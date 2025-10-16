import { createRoute, type RootRoute } from "@tanstack/react-router";
import { CheckCircle, Circle, Loader, Sparkles, Trash2, Palette, Plus } from "lucide-react";
import {
  useDeleteTodo,
  useGenerateTodoWithAI,
  useListTodos,
  useOptionalUser,
  useToggleTodo,
} from "@/lib/hooks";
import {
  useTodoSettings,
  useCreateTodoSetting,
  useDeleteTodoSetting,
  type TodoSetting,
} from "@/hooks/useTodoSettings";
import { useSelectedTheme } from "@/hooks/useAppPreferences";
import LoggedProvider from "@/components/logged-provider";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/components/user-button";
import { useState } from "react";

interface PublicTodoListProps {
  colors: {
    cardColor: string;
    completedColor: string;
    textColor: string;
  };
  selectedTheme?: TodoSetting;
}

function PublicTodoList({ colors, selectedTheme }: PublicTodoListProps) {
  const { data: todos } = useListTodos();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const handleToggle = (todoId: number) => {
    toggleTodo.mutate(todoId);
  };

  const handleDelete = (e: React.MouseEvent, todoId: number) => {
    e.stopPropagation(); // Prevent triggering the toggle
    deleteTodo.mutate(todoId);
  };

  // Get colors from props
  const { cardColor, completedColor, textColor } = colors;
  const activeTheme = selectedTheme;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">TODOs (Public)</h2>
        {activeTheme && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Palette className="w-3 h-3" />
            <span>{activeTheme.data.name}</span>
          </div>
        )}
      </div>

      {todos?.todos && todos.todos.length > 0
        ? (
          <div className="space-y-2">
            {todos.todos.slice(0, 3).map((todo) => (
              <div
                key={todo.id}
                className="group relative rounded-lg p-3 flex items-center gap-3 transition-all duration-200 border"
                style={{
                  backgroundColor: todo.completed ? completedColor : cardColor,
                  borderColor: todo.completed 
                    ? `${completedColor}dd` 
                    : `${cardColor}dd`,
                }}
              >
                <button
                  onClick={() => handleToggle(todo.id)}
                  disabled={toggleTodo.isPending || deleteTodo.isPending}
                  className="flex-1 flex items-center gap-3 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex-shrink-0">
                    {toggleTodo.isPending && toggleTodo.variables === todo.id
                      ? (
                        <Loader 
                          className="w-4 h-4 animate-spin" 
                          style={{ color: textColor + "99" }}
                        />
                      )
                      : todo.completed
                      ? (
                        <CheckCircle 
                          className="w-4 h-4" 
                          style={{ color: textColor + "99" }}
                        />
                      )
                      : (
                        <Circle 
                          className="w-4 h-4" 
                          style={{ color: textColor + "66" }}
                        />
                      )}
                  </div>
                  <span
                    className={`flex-1 text-sm ${todo.completed ? "line-through" : ""}`}
                    style={{
                      color: todo.completed ? textColor + "99" : textColor,
                    }}
                  >
                    {todo.title}
                  </span>
                </button>

                {/* Delete button - only visible on hover */}
                <button
                  onClick={(e) => handleDelete(e, todo.id)}
                  disabled={deleteTodo.isPending || toggleTodo.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded disabled:cursor-not-allowed flex-shrink-0"
                  style={{
                    backgroundColor: `${cardColor}aa`,
                  }}
                  title="Delete todo"
                >
                  {deleteTodo.isPending && deleteTodo.variables === todo.id
                    ? (
                      <Loader 
                        className="w-3 h-3 animate-spin" 
                        style={{ color: textColor + "99" }}
                      />
                    )
                    : (
                      <Trash2 
                        className="w-3 h-3 hover:text-red-400 transition-colors" 
                        style={{ color: textColor + "99" }}
                      />
                    )}
                </button>
              </div>
            ))}
            {todos.todos.length > 3 && (
              <p className="text-xs text-slate-500 text-center">
                +{todos.todos.length - 3} more
              </p>
            )}
          </div>
        )
        : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400">No todos yet</p>
          </div>
        )}
    </div>
  );
}

interface ThemeManagementProps {
  settings?: TodoSetting[];
  isConnected: boolean;
  selectedTheme?: TodoSetting;
  setSelectedTheme: (theme: TodoSetting | undefined) => void;
}

function ThemeManagement({ settings, isConnected, selectedTheme, setSelectedTheme }: ThemeManagementProps) {
  const createSetting = useCreateTodoSetting();
  const deleteSetting = useDeleteTodoSetting();
  const activeTheme = selectedTheme;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: "",
    description: "",
    cardColor: "#1e293b",
    completedColor: "#334155",
    textColor: "#e2e8f0",
  });

  // Preset themes for quick selection
  const presetThemes = [
    {
      name: "Ocean Blue",
      description: "Cool ocean vibes",
      cardColor: "#1e3a8a",
      completedColor: "#1e40af",
      textColor: "#bfdbfe",
    },
    {
      name: "Forest Green",
      description: "Natural forest tones",
      cardColor: "#14532d",
      completedColor: "#166534",
      textColor: "#bbf7d0",
    },
    {
      name: "Sunset Orange",
      description: "Warm sunset colors",
      cardColor: "#7c2d12",
      completedColor: "#9a3412",
      textColor: "#fed7aa",
    },
  ];

  const createPresetTheme = (preset: typeof presetThemes[0]) => {
    createSetting.mutate(preset);
  };

  const handleCreateTheme = () => {
    createSetting.mutate(
      newTheme,
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setNewTheme({
            name: "",
            description: "",
            cardColor: "#1e293b",
            completedColor: "#334155",
            textColor: "#e2e8f0",
          });
        },
      }
    );
  };

  const handleDeleteTheme = (uri: string) => {
    deleteSetting.mutate(uri);
    if (activeTheme?.uri === uri) {
      setSelectedTheme(undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Theme Settings</h3>
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        <strong>Click a theme below</strong> to apply it to TODO cards on the left. Changes apply in real-time!
      </p>

      {/* Default Theme Option */}
      <div className="space-y-2">
        <button
          onClick={() => setSelectedTheme(undefined)}
          className={`w-full bg-slate-800 border rounded-lg p-3 text-left transition-all hover:bg-slate-750 ${
            !activeTheme ? "border-blue-500 ring-2 ring-blue-500/50" : "border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">Default Theme</p>
                {!activeTheme && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Standard slate colors</p>
            </div>
          </div>
        </button>
      </div>

      {/* Preset Themes */}
      {(!settings || settings.length === 0) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-300">Quick Start - Try a Preset:</p>
          <div className="grid grid-cols-3 gap-2">
            {presetThemes.map((preset) => (
              <button
                key={preset.name}
                onClick={() => createPresetTheme(preset)}
                disabled={createSetting.isPending}
                className="bg-slate-800 border border-slate-700 rounded p-2 hover:bg-slate-700 transition-all disabled:opacity-50"
                title={`Create ${preset.name} theme`}
              >
                <div
                  className="w-full h-8 rounded mb-1 border border-slate-600"
                  style={{ backgroundColor: preset.cardColor }}
                />
                <p className="text-xs text-slate-300 truncate">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User Created Themes */}
      <div className="space-y-2">
        {settings && settings.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-300">Your Themes:</p>
            {settings.map((setting) => (
              <div
                key={setting.uri}
                onClick={() => setSelectedTheme(setting)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedTheme(setting);
                  }
                }}
                className={`w-full bg-slate-800 border rounded-lg p-3 text-left transition-all hover:bg-slate-750 cursor-pointer ${
                  activeTheme?.uri === setting.uri
                    ? "border-blue-500 ring-2 ring-blue-500/50"
                    : "border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {setting.data.name}
                      </p>
                      {activeTheme?.uri === setting.uri && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    {setting.data.description && (
                      <p className="text-xs text-slate-400">
                        {setting.data.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTheme(setting.uri);
                    }}
                    className="p-1 hover:bg-slate-700 rounded ml-2"
                    title="Delete theme"
                  >
                    <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <div
                      className="w-4 h-4 rounded border border-slate-600"
                      style={{ backgroundColor: setting.data.cardColor }}
                    />
                    <span>Card</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <div
                      className="w-4 h-4 rounded border border-slate-600"
                      style={{ backgroundColor: setting.data.completedColor }}
                    />
                    <span>Done</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <div
                      className="w-4 h-4 rounded border border-slate-600"
                      style={{ backgroundColor: setting.data.textColor }}
                    />
                    <span>Text</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Create Theme Form */}
      {showCreateForm ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-3">
          <input
            type="text"
            placeholder="Theme name (e.g., Ocean Blue)"
            value={newTheme.name}
            onChange={(e) =>
              setNewTheme({ ...newTheme, name: e.target.value })}
            className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newTheme.description}
            onChange={(e) =>
              setNewTheme({ ...newTheme, description: e.target.value })}
            className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Card Color
              </label>
              <input
                type="color"
                value={newTheme.cardColor}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, cardColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Done Color
              </label>
              <input
                type="color"
                value={newTheme.completedColor}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, completedColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Text Color
              </label>
              <input
                type="color"
                value={newTheme.textColor}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, textColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreateTheme}
              disabled={!newTheme.name || createSetting.isPending}
              size="sm"
              className="flex-1"
            >
              {createSetting.isPending ? "Creating..." : "Create"}
            </Button>
            <Button
              onClick={() => setShowCreateForm(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowCreateForm(true)}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Plus className="w-3 h-3 mr-2" />
          Create Theme
        </Button>
      )}
    </div>
  );
}

interface LoggedInContentProps {
  settings?: TodoSetting[];
  isConnected: boolean;
  selectedTheme?: TodoSetting;
  setSelectedTheme: (theme: TodoSetting | undefined) => void;
}

function LoggedInContent({ settings, isConnected, selectedTheme, setSelectedTheme }: LoggedInContentProps) {
  const generateTodo = useGenerateTodoWithAI();

  const handleGenerateTodo = () => {
    generateTodo.mutate();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-400">
        This content only shows up for authenticated users
      </h2>
      
      {/* Generate TODO Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
        <h3 className="text-sm font-medium text-white mb-2">
          Authenticated Content
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          This content is only visible when logged in.
        </p>

        {/* Generate TODO Button - Eye-catching */}
        <div className="mb-4">
          <Button
            onClick={handleGenerateTodo}
            disabled={generateTodo.isPending}
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-500 border-blue-500 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            {generateTodo.isPending
              ? (
                <>
                  <Loader className="w-3 h-3 animate-spin mr-2" />
                  Generating...
                </>
              )
              : (
                <>
                  <Sparkles className="w-3 h-3 mr-2" />
                  Generate TODO with AI
                </>
              )}
          </Button>
        </div>
      </div>

      {/* Theme Management Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <ThemeManagement
          settings={settings}
          isConnected={isConnected}
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
        />
      </div>
    </div>
  );
}

function PublicFallback() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-400">
        The content below is only visible for authenticated users
      </h2>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
        <h3 className="text-sm font-medium text-white mb-2">Login Required</h3>
        <p className="text-xs text-slate-400 mb-3">
          Sign in to access authenticated features.
        </p>
        <UserButton />
      </div>
    </div>
  );
}

function HomePage() {
  const user = useOptionalUser();
  
  // Fetch theme data ONCE at the top level
  const { settings: allThemes, isConnected } = useTodoSettings();
  const { selectedTheme, setSelectedTheme, colors } = useSelectedTheme(allThemes);

  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Deco"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-xl font-semibold text-white">
                Deco MCP Template
              </h1>
              <p className="text-sm text-slate-400">
                DeconfigResource + SSE + Database
              </p>
              <p className="text-xs text-slate-500 mt-1">
                💡 Login to create and apply custom TODO themes
              </p>
            </div>
          </div>

          <UserButton />
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-8 min-h-[400px]">
          {/* Left Column - Public Content */}
          <div>
            <PublicTodoList colors={colors} selectedTheme={selectedTheme} />
          </div>

          {/* Right Column - Auth Content */}
          <div>
            {user.data
              ? (
                <LoggedProvider>
                  <LoggedInContent 
                    settings={allThemes}
                    isConnected={isConnected}
                    selectedTheme={selectedTheme}
                    setSelectedTheme={setSelectedTheme}
                  />
                </LoggedProvider>
              )
              : <PublicFallback />}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Template includes: DeconfigResource (SSE), Tools, Workflows, Authentication, Database
            (SQLite + Drizzle)
          </p>
        </div>
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/",
    component: HomePage,
    getParentRoute: () => parentRoute,
  });
