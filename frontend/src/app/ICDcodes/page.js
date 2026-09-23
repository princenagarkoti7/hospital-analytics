import { redirect } from 'next/navigation';

export default function ICDcodesIndexPage() {
  // Whenever someone goes to /ICDcodes, automatically forward them to Dashboard
  redirect('/ICDcodes/Dashboard');
}