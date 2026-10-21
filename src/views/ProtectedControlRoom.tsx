import React, { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '../config/supabaseBrowser.ts';
import { loginUrlForControlRoom } from '../config/navigation.ts';

interface ProtectedControlRoomProps {
  returnPath: string;
  children: (onSignOut: () => Promise<void>) => React.ReactNode;
}

export const ProtectedControlRoom: React.FC<ProtectedControlRoomProps> = ({ returnPath, children }) => {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'error'>('checking');
  const logoutInProgress = useRef(false);
  const loginHref = loginUrlForControlRoom(returnPath);

  useEffect(() => {
    if (!supabaseBrowser) {
      window.location.replace(loginHref);
      return;
    }

    let active = true;
    const client = supabaseBrowser;
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace(logoutInProgress.current ? '/' : loginHref);
      }
    });

    void client.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthStatus('error');
        return;
      }
      if (!data.session) {
        window.location.replace(loginHref);
        return;
      }

      const { data: userData, error: userError } = await client.auth.getUser();
      if (!active) return;
      if (userError) {
        setAuthStatus('error');
      } else if (!userData.user) {
        window.location.replace(loginHref);
      } else {
        setAuthStatus('authenticated');
      }
    }).catch(() => {
      if (active) setAuthStatus('error');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loginHref]);

  const handleSignOut = async () => {
    if (!supabaseBrowser) throw new Error('Supabase Auth is unavailable.');
    logoutInProgress.current = true;
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) {
      logoutInProgress.current = false;
      throw new Error('Sign out could not be completed. Please try again.');
    }
    window.location.replace('/');
  };

  if (authStatus === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07111F] px-6 text-center text-[#EAF1FB]">
        <div>
          <h1 className="text-xl font-semibold">Could not verify your session</h1>
          <p className="mt-2 text-sm text-[#AAB6C8]">Sign in again to continue to the control room.</p>
          <a className="home-primary-cta mt-6" href={loginHref}>Continue to sign in</a>
        </div>
      </main>
    );
  }
  if (authStatus !== 'authenticated') {
    return <main className="grid min-h-screen place-items-center bg-[#07111F] text-sm text-[#AAB6C8]" role="status">Verifying your session…</main>;
  }

  return <>{children(handleSignOut)}</>;
};
