export default function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="p-6 rounded-2xl text-center"
      style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm mt-1 opacity-70">{message}</p>
    </div>
  );
}
