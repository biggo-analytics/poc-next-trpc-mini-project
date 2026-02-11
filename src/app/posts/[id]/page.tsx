"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const utils = trpc.useUtils();
  const { data: post, isLoading, error } = trpc.post.getById.useQuery({ id: postId });
  const { data: users } = trpc.user.list.useQuery({ page: 1, limit: 100 });

  const createCommentMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.post.getById.invalidate({ id: postId });
      setCommentContent("");
      setReplyTo(null);
      setReplyContent("");
    },
  });

  const deleteCommentMutation = trpc.comment.delete.useMutation({
    onSuccess: () => {
      utils.post.getById.invalidate({ id: postId });
    },
  });

  const publishMutation = trpc.post.publish.useMutation({
    onSuccess: () => utils.post.getById.invalidate({ id: postId }),
  });

  const archiveMutation = trpc.post.archive.useMutation({
    onSuccess: () => utils.post.getById.invalidate({ id: postId }),
  });

  const deleteMutation = trpc.post.delete.useMutation({
    onSuccess: () => router.push("/posts"),
  });

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!users?.items[0]) return;

    createCommentMutation.mutate({
      content: commentContent,
      authorId: users.items[0].id, // Use first user as author for demo
      postId,
    });
  }

  function handleReply(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!users?.items[0]) return;

    createCommentMutation.mutate({
      content: replyContent,
      authorId: users.items[0].id,
      postId,
      parentId,
    });
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (error || !post) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">
          {error?.message ?? "Post not found"}
        </p>
        <Link href="/posts" className="text-blue-600 hover:underline">
          Back to posts
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <Link href="/posts" className="text-blue-600 hover:underline text-sm">
          &larr; Back to posts
        </Link>
      </div>

      {/* Post Content */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{post.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`badge-${post.status.toLowerCase()}`}>
                {post.status}
              </span>
              <span className="text-sm text-gray-500">
                by {post.author.name ?? "Unknown"}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {post.status === "DRAFT" && (
              <button
                onClick={() => publishMutation.mutate({ id: post.id })}
                className="btn-primary text-sm"
              >
                Publish
              </button>
            )}
            {post.status === "PUBLISHED" && (
              <button
                onClick={() => archiveMutation.mutate({ id: post.id })}
                className="btn-secondary text-sm"
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
              className="btn-danger text-sm"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Categories */}
        {post.categories.length > 0 && (
          <div className="flex gap-2 mt-4">
            {post.categories.map((pc) => (
              <span
                key={pc.category.id}
                className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full"
              >
                {pc.category.name}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        {post.content && (
          <div className="mt-6 prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">
          Comments ({post._count.comments})
        </h2>

        {/* Add Comment Form */}
        <form onSubmit={handleComment} className="mb-6">
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="Write a comment..."
            className="input-field h-24 mb-2"
            required
          />
          <button
            type="submit"
            disabled={createCommentMutation.isLoading}
            className="btn-primary text-sm"
          >
            Post Comment
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {post.comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {comment.author.name ?? "Anonymous"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setReplyTo(replyTo === comment.id ? null : comment.id)
                    }
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => deleteCommentMutation.mutate({ id: comment.id })}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-700 mt-1">{comment.content}</p>

              {/* Reply Form */}
              {replyTo === comment.id && (
                <form
                  onSubmit={(e) => handleReply(e, comment.id)}
                  className="mt-2 ml-4"
                >
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="input-field h-16 text-sm mb-2"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={createCommentMutation.isLoading}
                      className="btn-primary text-xs"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-4 mt-3 space-y-3">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="border-l-2 border-blue-100 pl-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {reply.author.name ?? "Anonymous"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            deleteCommentMutation.mutate({ id: reply.id })
                          }
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-gray-700 mt-1 text-sm">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {post.comments.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
