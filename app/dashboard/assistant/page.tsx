import { AssistantChat } from "./AssistantChat";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="bg-gradient-to-r from-ink via-ink to-brand-600 bg-clip-text text-2xl font-bold text-transparent">
          Assistant 💬
        </h1>
        <p className="mt-1 text-sm text-muted">
          Chat with Claude about everything in your tracker — shipments, purchase orders,
          suppliers, and delivery status.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
