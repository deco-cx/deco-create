import { createRoute, Link, type RootRoute } from "@tanstack/react-router";
import { ArrowLeft, User } from "lucide-react";
import { useUser } from "@/lib/hooks";
import LoggedProvider from "@/components/logged-provider";
import { Button } from "@/components/ui/button";

function ProfileContent() {
  const { data: user } = useUser();

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="p-0 hover:bg-slate-800"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </Button>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
            {user.avatar
              ? (
                <img
                  src={user.avatar}
                  alt={user.name || "User"}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )
              : <User className="w-6 h-6 text-slate-300" />}
          </div>
          <div>
            <h1 className="text-lg font-medium text-white">User Profile</h1>
            <p className="text-sm text-slate-400">Account information</p>
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-4">
          <div className="flex justify-between py-2">
            <span className="text-sm text-slate-400">Name</span>
            <span className="text-sm text-white">
              {user.name || "Not provided"}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-slate-400">Email</span>
            <span className="text-sm text-white">{user.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-slate-400">ID</span>
            <span className="text-sm text-slate-400 font-mono">{user.id}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
          <Button
            asChild
            size="sm"
            className="flex-1 bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white border-slate-600"
          >
            <Link to="/">Home</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <a href="/oauth/logout">Logout</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="bg-slate-900 min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <LoggedProvider>
          <ProfileContent />
        </LoggedProvider>
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/profile",
    component: ProfilePage,
    getParentRoute: () => parentRoute,
  });
