"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

export default function PostsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    authorId: "",
    categoryIds: [] as string[],
  });

  const utils = trpc.useUtils();

  // Cursor-based pagination
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.post.list.useInfiniteQuery(
      {
        limit: 10,
        status: statusFilter
          ? (statusFilter as "DRAFT" | "PUBLISHED" | "ARCHIVED")
          : undefined,
        search: search || undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const { data: users } = trpc.user.list.useQuery({ page: 1, limit: 100 });
  const { data: categories } = trpc.category.list.useQuery();

  const createMutation = trpc.post.create.useMutation({
    onSuccess: () => {
      utils.post.list.invalidate();
      resetForm();
    },
  });

  const publishMutation = trpc.post.publish.useMutation({
    onSuccess: () => utils.post.list.invalidate(),
  });

  const archiveMutation = trpc.post.archive.useMutation({
    onSuccess: () => utils.post.list.invalidate(),
  });

  const deleteMutation = trpc.post.delete.useMutation({
    onSuccess: () => utils.post.list.invalidate(),
  });

  function resetForm() {
    setFormData({ title: "", content: "", authorId: "", categoryIds: [] });
    setShowForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
    });
  }

  const allPosts = data?.pages.flatMap((page) => page.items) ?? [];

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Posts</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "New Post"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field max-w-xs"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Create Post</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="input-field"
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="input-field h-32"
                placeholder="Write your content..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <select
                required
                value={formData.authorId}
                onChange={(e) =>
                  setFormData({ ...formData, authorId: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select author</option>
                {users?.items.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name ?? user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories?.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={formData.categoryIds.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            categoryIds: [...formData.categoryIds, cat.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            categoryIds: formData.categoryIds.filter(
                              (id) => id !== cat.id
                            ),
                          });
                        }
                      }}
                    />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="btn-primary"
              >
                Create
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
            {createMutation.error && (
              <p className="text-red-600 text-sm">{createMutation.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Post List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="space-y-4">
            {allPosts.map((post) => (
              <div key={post.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/posts/${post.id}`}
                      className="text-xl font-bold hover:text-blue-600"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`badge-${post.status.toLowerCase()}`}>
                        {post.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        by {post.author.name ?? "Unknown"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {post._count.comments} comments
                      </span>
                    </div>
                    {post.categories.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {post.categories.map((pc) => (
                          <span
                            key={pc.category.id}
                            className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {pc.category.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {post.content && (
                      <p className="text-gray-600 mt-2 line-clamp-2">
                        {post.content}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {post.status === "DRAFT" && (
                      <button
                        onClick={() => publishMutation.mutate({ id: post.id })}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Publish
                      </button>
                    )}
                    {post.status === "PUBLISHED" && (
                      <button
                        onClick={() => archiveMutation.mutate({ id: post.id })}
                        className="text-yellow-600 hover:text-yellow-800 text-sm"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Are you sure?")) {
                          deleteMutation.mutate({ id: post.id });
                        }
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More (Cursor pagination) */}
          {hasNextPage && (
            <div className="text-center mt-6">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="btn-secondary"
              >
                {isFetchingNextPage ? "Loading more..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
