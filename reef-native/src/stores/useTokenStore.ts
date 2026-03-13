import {create} from 'zustand';
import {
  TokenBalance,
  NFT,
  TransactionRecord,
  StatusDataObject,
  createLoadingStatus,
} from '../types';

interface TokenState {
  selectedErc20s: StatusDataObject<TokenBalance[]>;
  selectedNFTs: StatusDataObject<NFT[]>;
  reefPrice: number;
  txHistory: StatusDataObject<TransactionRecord[]>;

  setSelectedErc20s: (tokens: StatusDataObject<TokenBalance[]>) => void;
  setSelectedNFTs: (nfts: StatusDataObject<NFT[]>) => void;
  setReefPrice: (price: number) => void;
  setTxHistory: (history: StatusDataObject<TransactionRecord[]>) => void;
}

export const useTokenStore = create<TokenState>(set => ({
  selectedErc20s: createLoadingStatus(),
  selectedNFTs: createLoadingStatus(),
  reefPrice: 0,
  txHistory: createLoadingStatus(),

  setSelectedErc20s: tokens => set({selectedErc20s: tokens}),
  setSelectedNFTs: nfts => set({selectedNFTs: nfts}),
  setReefPrice: price => set({reefPrice: price}),
  setTxHistory: history => set({txHistory: history}),
}));
