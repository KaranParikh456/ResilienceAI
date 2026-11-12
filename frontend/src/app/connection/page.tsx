import LocalAuth from '@/app/components/ui/LocalAuth';
export const metadata = { title: 'Connection settings' };
export default function ConnectionSettings() {
  return <div className="max-w-3xl mx-auto space-y-6"><h1 className="font-display text-3xl">Connection settings</h1><LocalAuth /></div>;
}
