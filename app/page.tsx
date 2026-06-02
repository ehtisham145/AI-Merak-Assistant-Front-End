import ChatWidget from "./components/ChatWidget";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <h1 className="text-2xl font-bold text-gray-700">Tax Invoice Website</h1>
      <ChatWidget />
    </main>
  );
}