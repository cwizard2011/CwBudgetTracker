import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const KEY_CATEGORIES = 'budget_categories';

export interface CategoryContextValue {
  categories: string[];
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
}

const DEFAULTS = [
  'Housing',
  'Utilities',
  'Groceries',
  'Transport',
  'Healthcare',
  'Entertainment',
  'Savings',
  'Misc',
];

const CategoryContext = createContext<CategoryContextValue>({} as CategoryContextValue);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<string[]>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY_CATEGORIES);
      if (raw) setCategories(JSON.parse(raw));
    })();
  }, []);

  const persist = async (next: string[]) => {
    setCategories(next);
    await AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(next));
  };

  const addCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return;
    await persist([...categories, trimmed]);
  };

  const removeCategory = async (name: string) => {
    await persist(categories.filter(c => c !== name));
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory, removeCategory }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => useContext(CategoryContext);


