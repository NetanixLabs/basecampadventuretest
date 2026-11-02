import { Card } from "@/components/admin/ui";
import { Chat } from "@/components/chat";
import type { ChatMessage } from "@/lib/server/messages";

/** Messages with the traveller (also on their trip page). Encrypted in the database. */
export function BookingMessages({ bookingId, messages, unread }: { bookingId: string; messages: ChatMessage[]; unread: number }) {
  return (
    <div id="messages" className="scroll-mt-24">
      <Card title={unread ? `Messages with the traveller · ${unread} new` : "Messages with the traveller"} info="Messages from the traveller's trip page arrive here. Your reply appears on their trip page and they get an email saying a message is waiting (the email never contains the message itself). Messages and attachments are encrypted in the database and deleted with the traveller's account after the trip.">
        <Chat bookingId={bookingId} side="office" initial={messages} placeholder="e.g. Please upload a clearer copy of your passport photo page." empty="No messages yet. Write first if you need something from the traveller." />
      </Card>
    </div>
  );
}
