"use client";

import { truncate } from "@/utils/truncate";

interface ThreadItemProps {
  threadId: string;
  title: string;
}

export function ThreadItem({ title }: ThreadItemProps) {
  return <span className="block truncate">{truncate(title, 40)}</span>;
}
