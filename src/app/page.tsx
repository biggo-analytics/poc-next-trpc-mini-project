"use client";

import { trpc } from "@/lib/trpc-client";
import Link from "next/link";

export default function HomePage() {
  const { data: users } = trpc.user.list.useQuery({ page: 1, limit: 5 });
  const { data: posts } = trpc.post.list.useQuery({ limit: 5 });
  const { data: categories } = trpc.category.list.useQuery();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-600">Total Users</h2>
          <p className="text-3xl font-bold mt-2">
            {users?.total ?? "..."}
          </p>
          <Link href="/users" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
            View all users
          </Link>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-600">Total Posts</h2>
          <p className="text-3xl font-bold mt-2">
            {posts?.items.length ?? "..."}
          </p>
          <Link href="/posts" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
            View all posts
          </Link>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-600">Categories</h2>
          <p className="text-3xl font-bold mt-2">
            {categories?.length ?? "..."}
          </p>
          <Link href="/categories" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
            View all categories
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Users</h2>
          <ul className="space-y-3">
            {users?.items.map((user) => (
              <li key={user.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{user.name ?? "Unnamed"}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <span className={`badge ${user.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                  {user.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Posts</h2>
          <ul className="space-y-3">
            {posts?.items.map((post) => (
              <li key={post.id} className="border-b pb-2">
                <Link href={`/posts/${post.id}`} className="hover:text-blue-600">
                  <p className="font-medium">{post.title}</p>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge-${post.status.toLowerCase()}`}>
                    {post.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    by {post.author.name ?? "Unknown"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
