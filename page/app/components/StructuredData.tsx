import React from 'react';
import Script from 'next/script';

export default function StructuredData() {
  const stakingService = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Starknet STRK Staking",
    "description": "Stake your STRK tokens on Starknet to earn rewards and support network security",
    "provider": {
      "@type": "Organization",
      "name": "Starknet Staking Dashboard",
      "url": "https://www.starknet-stake.com"
    },
    "serviceType": "Cryptocurrency Staking",
    "areaServed": "Worldwide",
    "offers": {
      "@type": "Offer",
      "description": "Stake STRK tokens with selected validators",
      "url": "https://www.starknet-stake.com/"
    },
    "termsOfService": "https://www.starknet-stake.com/terms",
    "audience": {
      "@type": "Audience",
      "audienceType": "Starknet users and STRK token holders"
    }
  };

  const howToStake = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Stake STRK on Starknet",
    "description": "A step-by-step guide to staking your STRK tokens on Starknet",
    "totalTime": "PT5M",
    "step": [
      {
        "@type": "HowToStep",
        "name": "Connect Your Wallet",
        "text": "Connect your Starknet wallet such as ArgentX or Braavos",
        "url": "https://www.starknet-stake.com/#connect-wallet"
      },
      {
        "@type": "HowToStep",
        "name": "Choose a Validator",
        "text": "Browse the list of validators and select one based on performance metrics",
        "url": "https://www.starknet-stake.com/#validators"
      },
      {
        "@type": "HowToStep",
        "name": "Enter Stake Amount",
        "text": "Enter the amount of STRK tokens you wish to stake",
        "url": "https://www.starknet-stake.com/#stake"
      },
      {
        "@type": "HowToStep",
        "name": "Confirm Transaction",
        "text": "Review and confirm your staking transaction",
        "url": "https://www.starknet-stake.com/#confirm"
      },
      {
        "@type": "HowToStep",
        "name": "Track Your Rewards",
        "text": "Monitor your staking rewards and performance",
        "url": "https://www.starknet-stake.com/#rewards"
      }
    ]
  };

  // Convert objects to strings outside of JSX for better security
  const stakingServiceString = JSON.stringify(stakingService);
  const howToStakeString = JSON.stringify(howToStake);

  return (
    <>
      <Script 
        id="staking-service-schema"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {stakingServiceString}
      </Script>
      <Script
        id="how-to-stake-schema"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {howToStakeString}
      </Script>
    </>
  );
} 