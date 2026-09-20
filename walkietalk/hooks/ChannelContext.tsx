import React, { createContext, useContext } from 'react';
import { useChannel, type UseChannelResult } from './useChannel';

const ChannelContext = createContext<UseChannelResult | null>(null);

/**
 * Provides a single shared channel/socket session to the whole (app) group so
 * the channel list, radio and log screens stay in sync (one socket, one
 * current channel).
 */
export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const channel = useChannel(1);
  return <ChannelContext.Provider value={channel}>{children}</ChannelContext.Provider>;
}

export function useChannelContext(): UseChannelResult {
  const ctx = useContext(ChannelContext);
  if (!ctx) {
    throw new Error('useChannelContext must be used within a ChannelProvider');
  }
  return ctx;
}

export default ChannelContext;
