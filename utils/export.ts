import { Card } from "@/types/card";
import { Platform } from "react-native";

export async function exportToCSV(cards: Card[]): Promise<void> {
  const headers = [
    "Name",
    "Year",
    "Set",
    "Card Number",
    "Sport/Category",
    "Team",
    "Rarity",
    "Price",
    "Grade",
    "Grade Company",
    "Date Added",
  ];

  const rows = cards.map(card => [
    card.name,
    card.year || "",
    card.set || "",
    card.cardNumber || "",
    card.subcategory || "",
    card.team || "",
    card.rarity || "",
    card.price?.toFixed(2) || "",
    card.grade || "",
    card.gradeCompany || "",
    new Date(card.dateAdded).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n");

  if (Platform.OS === "web") {
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sports_cards_collection_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // For mobile platforms, you would need to implement file system operations
    // This is a simplified version - in production you'd use expo-file-system
    console.log("CSV Export:", csvContent);
  }
}