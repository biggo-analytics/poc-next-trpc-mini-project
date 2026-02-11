"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });

  const utils = trpc.useUtils();
  const { data: categories, isLoading, error } = trpc.category.list.useQuery();

  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      resetForm();
    },
  });

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      resetForm();
    },
  });

  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => utils.category.list.invalidate(),
  });

  function resetForm() {
    setFormData({ name: "", slug: "" });
    setShowForm(false);
    setEditingCategory(null);
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function startEdit(category: { id: string; name: string; slug: string }) {
    setFormData({ name: category.name, slug: category.slug });
    setEditingCategory(category.id);
    setShowForm(true);
  }

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Add Category"}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingCategory ? "Edit Category" : "Create Category"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    name,
                    slug: editingCategory ? formData.slug : generateSlug(name),
                  });
                }}
                className="input-field"
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="input-field"
                placeholder="category-slug"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL-friendly identifier (lowercase, hyphens only)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isLoading || updateMutation.isLoading}
                className="btn-primary"
              >
                {editingCategory ? "Update" : "Create"}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
            {(createMutation.error || updateMutation.error) && (
              <p className="text-red-600 text-sm">
                {createMutation.error?.message || updateMutation.error?.message}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Categories Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((category) => (
            <div key={category.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{category.name}</h3>
                  <p className="text-sm text-gray-500">/{category.slug}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {category._count.posts} posts
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (category._count.posts > 0) {
                        alert("Cannot delete category with associated posts");
                        return;
                      }
                      if (confirm("Are you sure?")) {
                        deleteMutation.mutate({ id: category.id });
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

          {categories?.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No categories yet. Create one to get started!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
