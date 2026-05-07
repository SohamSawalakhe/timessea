"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Drawer } from "vaul";
import { Send, Heart, MessageCircle, Loader2, X, Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";
import { globalSocket } from "@/lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: string;
  name: string;
  picture: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: User;
  likes: number;
  liked: boolean;
  replies: Comment[];
  parentId: string | null;
}

interface CommentsDrawerProps {
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentCount: number;
  onCommentChange?: () => void;
}

// Recursive helper to update a comment in the tree
const updateCommentInTree = (
  comments: Comment[],
  commentId: string,
  updater: (c: Comment) => Comment,
): Comment[] => {
  return comments.map((c) => {
    if (c.id === commentId) {
      return updater(c);
    }
    if (c.replies?.length > 0) {
      return {
        ...c,
        replies: updateCommentInTree(c.replies, commentId, updater),
      };
    }
    return c;
  });
};

// Recursive helper to add a reply to a specific parent
const addReplyToTree = (
  comments: Comment[],
  parentId: string,
  newReply: Comment,
): Comment[] => {
  return comments.map((c) => {
    if (c.id === parentId) {
      return {
        ...c,
        replies: [...(c.replies || []), newReply],
      };
    }
    if (c.replies?.length > 0) {
      return {
        ...c,
        replies: addReplyToTree(c.replies, parentId, newReply),
      };
    }
    return c;
  });
};

// Recursive helper to remove a comment (or revert optimistic add)
const removeCommentFromTree = (
  comments: Comment[],
  commentId: string,
): Comment[] => {
  return comments
    .filter((c) => c.id !== commentId)
    .map((c) => ({
      ...c,
      replies: c.replies ? removeCommentFromTree(c.replies, commentId) : [],
    }));
};

interface CommentItemProps {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  depth?: number;
}

const CommentItem = ({
  comment,
  onReply,
  onLike,
  onDelete,
  currentUserId,
  depth = 0,
}: CommentItemProps) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <div className={cn(depth > 0 && "mt-3")}>
      <div className="group flex gap-3 items-start">
        {comment.author.picture ? (
          <Image
            src={comment.author.picture}
            alt={comment.author.name}
            width={depth === 0 ? 32 : 24}
            height={depth === 0 ? 32 : 24}
            className={cn(
              "rounded-full object-cover shrink-0",
              depth === 0 ? "h-8 w-8" : "h-6 w-6",
            )}
          />
        ) : (
          <div
            className={cn(
              "rounded-full bg-muted shrink-0 flex items-center justify-center font-bold",
              depth === 0 ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]",
            )}
          >
            {comment.author.name?.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold truncate">
              {comment.author.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm leading-relaxed mt-0.5">{comment.content}</p>

          <div className="flex items-center gap-4 mt-1.5">
            <button
              onClick={() => onReply(comment)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
            {comment.likes > 0 && (
              <span className="text-xs text-muted-foreground">
                {comment.likes} {comment.likes === 1 ? "like" : "likes"}
              </span>
            )}
            {currentUserId === comment.author.id && !isConfirmingDelete && (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-xs font-semibold text-muted-foreground/60 hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
          
          {isConfirmingDelete && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex flex-col gap-2">
              <span className="text-xs font-bold text-destructive">Delete this comment?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="text-[10px] font-semibold bg-background border border-border px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(comment.id);
                    setIsConfirmingDelete(false);
                  }}
                  className="text-[10px] font-bold bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md shadow-sm hover:bg-destructive/90 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => onLike(comment.id)} className="shrink-0 pt-1">
          <Heart
            className={cn(
              "h-4 w-4",
              comment.liked
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground",
            )}
          />
        </button>
      </div>

      {/* Nested Replies */}
      {comment.replies?.length > 0 && (
        <div className={cn("mt-3 space-y-3", depth === 0 ? "pl-11" : "pl-9")}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function CommentsDrawer({
  articleId,
  open,
  onOpenChange,
  commentCount: initialCommentCount,
  onCommentChange,
}: CommentsDrawerProps) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchComments = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        `${API_URL}/api/comments/article/${articleId}`,
        { headers, cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      if (!background) setLoading(false);
    }
  }, [articleId, token]);

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, articleId]);

  useEffect(() => {
    if (open && refreshTrigger > 0) {
      fetchComments(true);
    }
  }, [refreshTrigger, open, articleId, fetchComments]);

  useEffect(() => {
    const handleCommentCountUpdate = (data: { articleId: string; commentCount: number }) => {
      if (data.articleId === articleId) {
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    const handleCommentLiked = (data: { commentId: string; likes: number; articleId: string }) => {
      if (data.articleId === articleId) {
        setComments((prev) =>
          updateCommentInTree(prev, data.commentId, (c) => ({
            ...c,
            likes: data.likes,
            // If the user liked it themselves from another tab, 
            // the local "liked" bool might still be stale, but we sync the raw count.
          }))
        );
      }
    };

    globalSocket.on("commentCountUpdate", handleCommentCountUpdate);
    globalSocket.on("commentLiked", handleCommentLiked);

    return () => {
      globalSocket.off("commentCountUpdate", handleCommentCountUpdate);
      globalSocket.off("commentLiked", handleCommentLiked);
    };
  }, [articleId]);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);



  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;

    const tempId = `temp-${Date.now()}`;
    const commentContent = newComment; // Capture current value
    const parentId = replyingTo?.id || null;

    // Create optimistic comment
    const optimisticComment: Comment = {
      id: tempId,
      content: commentContent,
      createdAt: new Date().toISOString(),
      author: {
        id: user.id || "temp-user",
        name: user.name || "User",
        picture: user.picture || null,
      },
      likes: 0,
      liked: false,
      replies: [],
      parentId: parentId,
    };

    // Optimistically update state
    setNewComment("");
    setReplyingTo(null);

    setComments((prev) => {
      if (parentId) {
        return addReplyToTree(prev, parentId, optimisticComment);
      } else {
        return [optimisticComment, ...prev];
      }
    });

    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: commentContent,
          articleId,
          parentId: parentId,
        }),
      });

      if (res.ok) {
        const savedComment = await res.json();

        // Replace temp comment with real one
        setComments((prev) =>
          updateCommentInTree(prev, tempId, () => savedComment),
        );

        onCommentChange?.();
      } else {
        throw new Error("Failed to save comment");
      }
    } catch (error) {
      console.error("Failed to post comment", error);
      // Revert state on error
      setNewComment(commentContent);
      setReplyingTo(replyingTo); // This might be tricky if we cleared it, but best effort

      setComments((prev) => removeCommentFromTree(prev, tempId));
    }
  };

  const handleLike = async (commentId: string) => {
    // Optimistic update
    setComments((prev) =>
      updateCommentInTree(prev, commentId, (c) => ({
        ...c,
        liked: !c.liked,
        likes: c.liked ? c.likes - 1 : c.likes + 1,
      })),
    );

    try {
      await fetch(`${API_URL}/api/comments/${commentId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Revert on error
      console.error("Failed to toggle like", error);
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...c,
          liked: !c.liked,
          likes: c.liked ? c.likes + 1 : c.likes - 1, // Inverse
        })),
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setComments((prev) => removeCommentFromTree(prev, commentId));
        toast.success("Comment and its replies deleted successfully");
        onCommentChange?.(); // Refresh count
      } else {
        toast.error("Failed to delete comment");
      }
    } catch (error) {
      console.error("Failed to delete comment", error);
      toast.error("An error occurred while deleting the comment");
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-100" />
        <Drawer.Content 
          onPointerDownOutside={(e) => {
            const tgt = e.target as HTMLElement;
            if (tgt.closest('.Toastify')) {
              e.preventDefault();
            }
          }}
          className="fixed bottom-0 left-0 right-0 mx-auto max-w-lg max-h-[85vh] h-[70vh] flex flex-col rounded-t-[20px] bg-background z-100 outline-none shadow-2xl border border-border/50"
        >
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mt-3 mb-2" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
            <div className="w-8" /> {/* Spacer for centering */}
            <Drawer.Title className="font-semibold text-sm">
              Comments
            </Drawer.Title>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MessageCircle className="h-12 w-12 stroke-1 opacity-50" />
                <p className="text-sm">
                  No comments yet. Start the conversation.
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={setReplyingTo}
                  onLike={handleLike}
                  onDelete={handleDeleteComment}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="shrink-0 p-4 border-t border-border bg-background pb-8 sm:pb-4 z-50 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {replyingTo && (
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2 rounded-t-lg text-xs text-muted-foreground mb-2 shadow-sm border border-border/50">
                <span>
                  Replying to{" "}
                  <span className="font-bold text-foreground">
                    @{replyingTo.author.name}
                  </span>
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="hover:text-foreground p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyingTo ? "Write a reply..." : "Add a comment..."
                }
                className="flex-1 bg-muted/50 hover:bg-muted/80 focus:bg-background rounded-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium border border-border focus:border-primary/50"
                onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
              />
              <button
                disabled={!newComment.trim()}
                onClick={handlePostComment}
                className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm"
              >
                <Send className="h-4 w-4 ml-0.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
