'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the context type
interface WalletContextType {
  walletConnected: boolean;
  account: any;
  isConnecting: boolean;
  connectWallet: () => Promise<any>;
  disconnectWallet: () => void;
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  walletConnected: false,
  account: null,
  isConnecting: false,
  connectWallet: async () => null,
  disconnectWallet: () => {},
});

// Export the hook for components to use
export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        // Check if we have a stored wallet connection
        const storedConnection = localStorage.getItem('walletConnected');
        
        if (storedConnection === 'true' && window.starknet) {
          // Attempt to reconnect
          setIsConnecting(true);
          
          try {
            await window.starknet.enable();
            
            if (window.starknet.isConnected) {
              const userAccount = window.starknet.account;
              setAccount(userAccount);
              setWalletConnected(true);
            }
          } catch (error) {
            console.error('Failed to reconnect wallet:', error);
            // Clear stored connection on failure
            localStorage.removeItem('walletConnected');
          }
          
          setIsConnecting(false);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkWalletConnection();
  }, []);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      
      if (!window.starknet) {
        throw new Error("Please install ArgentX, Braavos, or another Starknet wallet");
      }

      await window.starknet.enable();
      
      if (!window.starknet.isConnected) {
        throw new Error("Failed to connect to wallet");
      }
      
      const userAccount = window.starknet.account;
      setAccount(userAccount);
      setWalletConnected(true);
      
      // Store connection state in localStorage
      localStorage.setItem('walletConnected', 'true');
      
      return userAccount;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setAccount(null);
    // Remove connection state from localStorage
    localStorage.removeItem('walletConnected');
  };

  return (
    <WalletContext.Provider
      value={{
        walletConnected,
        account,
        isConnecting,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
} 