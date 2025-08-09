import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Share2, Download, Grid } from "lucide-react-native";
import { useCards } from "@/hooks/card-store";
import { exportToCSV } from "@/utils/export";

const LAYOUT_STYLES = [
  { id: "grid", name: "GRID", cols: 3 },
  { id: "list", name: "LIST", cols: 1 },
  { id: "showcase", name: "SHOWCASE", cols: 2 },
];

export default function ShareScreen() {
  const { cards } = useCards();
  const [selectedLayout, setSelectedLayout] = useState("grid");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleShare = () => {
    if (selectedCards.length === 0) {
      Alert.alert("NO CARDS SELECTED", "SELECT CARDS TO SHARE");
      return;
    }

    const shareText = selectedCards
      .map(id => {
        const card = cards.find(c => c.id === id);
        return card ? `${card.name} - ${card.year} ${card.set} #${card.cardNumber}` : "";
      })
      .filter(Boolean)
      .join("\n");

    Alert.alert("SHARE", shareText);
  };

  const handleExportSelected = async () => {
    if (selectedCards.length === 0) {
      Alert.alert("NO CARDS SELECTED", "SELECT CARDS TO EXPORT");
      return;
    }

    const selectedCardData = cards.filter(card => selectedCards.includes(card.id));
    
    try {
      await exportToCSV(selectedCardData);
      Alert.alert("SUCCESS", `EXPORTED ${selectedCards.length} CARDS`);
    } catch {
      Alert.alert("ERROR", "FAILED TO EXPORT CARDS");
    }
  };

  const selectAll = () => {
    setSelectedCards(cards.map(card => card.id));
  };

  const clearSelection = () => {
    setSelectedCards([]);
  };

  const renderCard = (card: any) => {
    const isSelected = selectedCards.includes(card.id);
    
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          selectedLayout === "list" && styles.listCard,
          selectedLayout === "showcase" && styles.showcaseCard,
        ]}
        onPress={() => toggleCardSelection(card.id)}
      >
        {card.imageUri ? (
          <Image 
            source={{ uri: card.imageUri }} 
            style={[
              styles.cardImage,
              selectedLayout === "list" && styles.listCardImage,
              selectedLayout === "showcase" && styles.showcaseCardImage,
            ]} 
          />
        ) : (
          <View style={[
            styles.cardImage,
            styles.placeholderImage,
            selectedLayout === "list" && styles.listCardImage,
            selectedLayout === "showcase" && styles.showcaseCardImage,
          ]}>
            <Text style={styles.placeholderText}>NO IMG</Text>
          </View>
        )}
        
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
          <Text style={styles.cardDetails}>{card.year}</Text>
        </View>
        
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {selectedCards.length} / {cards.length} SELECTED
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickButton} onPress={selectAll}>
              <Text style={styles.quickButtonText}>ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={clearSelection}>
              <Text style={styles.quickButtonText}>CLEAR</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.layoutSelector}
        >
          {LAYOUT_STYLES.map(layout => (
            <TouchableOpacity
              key={layout.id}
              style={[
                styles.layoutButton,
                selectedLayout === layout.id && styles.layoutButtonActive
              ]}
              onPress={() => setSelectedLayout(layout.id)}
            >
              <Grid size={16} color={selectedLayout === layout.id ? "#000000" : "#FFFFFF"} strokeWidth={3} />
              <Text style={[
                styles.layoutButtonText,
                selectedLayout === layout.id && styles.layoutButtonTextActive
              ]}>
                {layout.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.cardsGrid,
          selectedLayout === "list" && styles.listLayout,
          selectedLayout === "showcase" && styles.showcaseLayout,
        ]}>
          {cards.map(renderCard)}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
        >
          <Share2 size={20} color="#000000" strokeWidth={3} />
          <Text style={styles.actionButtonText}>SHARE</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.exportButton]}
          onPress={handleExportSelected}
        >
          <Download size={20} color="#FFFFFF" strokeWidth={3} />
          <Text style={[styles.actionButtonText, styles.exportButtonText]}>EXPORT CSV</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#808080",
  },
  header: {
    backgroundColor: "#000000",
    paddingBottom: 15,
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  statsText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  quickButton: {
    backgroundColor: "#FF00FF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  layoutSelector: {
    paddingHorizontal: 15,
  },
  layoutButton: {
    flexDirection: "row",
    backgroundColor: "#808080",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    gap: 8,
  },
  layoutButtonActive: {
    backgroundColor: "#FFFF00",
  },
  layoutButtonText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  layoutButtonTextActive: {
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 7.5,
  },
  listLayout: {
    flexDirection: "column",
  },
  showcaseLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: {
    width: "31.33%",
    margin: "1%",
    backgroundColor: "#000000",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  listCard: {
    width: "98%",
    flexDirection: "row",
    marginBottom: 10,
  },
  showcaseCard: {
    width: "48%",
  },
  cardSelected: {
    borderColor: "#00FF00",
    borderWidth: 4,
  },
  cardImage: {
    width: "100%",
    height: 150,
  },
  listCardImage: {
    width: 80,
    height: 110,
  },
  showcaseCardImage: {
    height: 200,
  },
  placeholderImage: {
    backgroundColor: "#808080",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: 8,
    backgroundColor: "#FFFF00",
  },
  cardName: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.3,
  },
  cardDetails: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#000000",
    marginTop: 2,
  },
  selectedBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#00FF00",
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  selectedText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
  },
  actionBar: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#000000",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    gap: 10,
  },
  shareButton: {
    backgroundColor: "#00FF00",
  },
  exportButton: {
    backgroundColor: "#FF0000",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  exportButtonText: {
    color: "#FFFFFF",
  },
});