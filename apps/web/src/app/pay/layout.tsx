import '../globals.css';

export const metadata = {
  title: 'Complete Your Payment — ReconAI',
  description: 'Secure payment recovery portal powered by ReconAI × Razorpay',
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060a14]">
      {children}
    </div>
  );
}
