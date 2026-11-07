"use client";

import { Card } from "@/components/admin/ui";
import { Chat } from "@/components/chat";
import type { ChatMessage } from "@/lib/server/messages";
import type { SavedReply } from "@/lib/server/replies";
import { deleteReply, saveReply } from "../replies-actions";

/** Messages with the traveller (also on their trip page). Encrypted in the database. */
export function BookingMessages({ bookingId, messages, unread, replies, name }: { bookingId: string; messages: ChatMessage[]; unread: number; replies: SavedReply[]; name: string }) {
  return (
    <div id="messages" className="scroll-mt-24">
      <Card title={unread ? `Messages with the traveller · ${unread} new` : "Messages with the traveller"} info="Messages from the traveller's trip page arrive here. Your reply appears on their trip page; they get a phone notification (if switched on) or an email saying a message is waiting (never the message itself). Saved replies are shared by the whole team; {name} becomes the traveller's first name. Messages and attachments are encrypted in the database and deleted with the traveller's account after the trip.">
        <Chat bookingId={bookingId} side="office" initial={messages} replies={{ list: replies, name, save: saveReply, remove: deleteReply }} placeholder="e.g. Please upload a clearer copy of your passport photo page." empty="No messages yet. Write first if you need something from the traveller." />
      </Card>
    </div>
  );
}
