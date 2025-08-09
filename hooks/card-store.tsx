import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { Card, Folder } from "@/types/card";

interface CardStore {
  cards: Card[];
  folders: Folder[];
  isLoading: boolean;
  addCard: (card: Card) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  clearAllCards: () => void;
  createFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  moveCardToFolder: (cardId: string, folderId: string | null) => void;
}

const CARDS_STORAGE_KEY = "@sports_cards_collection";
const FOLDERS_STORAGE_KEY = "@sports_cards_folders";

export const [CardProvider, useCards] = createContextHook<CardStore>(() => {
  const [cards, setCards] = useState<Card[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cardsData, foldersData] = await Promise.all([
        AsyncStorage.getItem(CARDS_STORAGE_KEY),
        AsyncStorage.getItem(FOLDERS_STORAGE_KEY),
      ]);

      if (cardsData) {
        setCards(JSON.parse(cardsData));
      }
      if (foldersData) {
        setFolders(JSON.parse(foldersData));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCards = async (newCards: Card[]) => {
    try {
      await AsyncStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(newCards));
      setCards(newCards);
    } catch (error) {
      console.error("Error saving cards:", error);
    }
  };

  const saveFolders = async (newFolders: Folder[]) => {
    try {
      await AsyncStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(newFolders));
      setFolders(newFolders);
    } catch (error) {
      console.error("Error saving folders:", error);
    }
  };

  const addCard = useCallback((card: Card) => {
    const newCards = [...cards, card];
    saveCards(newCards);
  }, [cards]);

  const updateCard = useCallback((id: string, updates: Partial<Card>) => {
    const newCards = cards.map(card => 
      card.id === id ? { ...card, ...updates } : card
    );
    saveCards(newCards);
  }, [cards]);

  const deleteCard = useCallback((id: string) => {
    const newCards = cards.filter(card => card.id !== id);
    saveCards(newCards);
  }, [cards]);

  const createFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
    };
    const newFolders = [...folders, newFolder];
    saveFolders(newFolders);
  }, [folders]);

  const deleteFolder = useCallback((id: string) => {
    const newFolders = folders.filter(folder => folder.id !== id);
    saveFolders(newFolders);
    
    const newCards = cards.map(card => 
      card.folderId === id ? { ...card, folderId: null } : card
    );
    saveCards(newCards);
  }, [folders, cards]);

  const moveCardToFolder = useCallback((cardId: string, folderId: string | null) => {
    const newCards = cards.map(card => 
      card.id === cardId ? { ...card, folderId } : card
    );
    saveCards(newCards);
  }, [cards]);

  const clearAllCards = useCallback(() => {
    saveCards([]);
  }, []);

  return {
    cards,
    folders,
    isLoading,
    addCard,
    updateCard,
    deleteCard,
    clearAllCards,
    createFolder,
    deleteFolder,
    moveCardToFolder,
  };
});