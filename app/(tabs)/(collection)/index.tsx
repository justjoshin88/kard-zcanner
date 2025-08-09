import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Grid, List, Download } from "lucide-react-native";
import { useCards } from "@/hooks/card-store";
import { exportToCSV } from "@/utils/export";

export default function CollectionScreen() {
  const router = useRouter();
  const { cards, folders, createFolder } = useCards();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [filterSport] = useState<string | null>(null);

  const filteredCards = useMemo(() => {
    let filtered = cards;
    
    if (selectedFolder) {
      filtered = filtered.filter(card => card.folderId === selectedFolder);
    }
    
    if (filterSport) {
      filtered = filtered.filter(card => card.subcategory === filterSport);
    }
    
    return filtered;
  }, [cards, selectedFolder, filterSport]);

  const totalValue = useMemo(() => {
    return filteredCards.reduce((sum, card) => sum + (card.price || 0), 0);
  }, [filteredCards]);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowFolderModal(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportToCSV(filteredCards);
      Alert.alert("SUCCESS", "COLLECTION EXPORTED TO CSV");
    } catch {
      Alert.alert("ERROR", "FAILED TO EXPORT COLLECTION");
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    if (viewMode === "grid") {
      return (
        <TouchableOpacity 
          style={styles.gridCard}
          onPress={() => router.push(`/(collection)/${item.id}`)}
        >
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.gridImage} />
          ) : (
            <View style={[styles.gridImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>NO IMAGE</Text>
            </View>
          )}
          <View style={styles.gridInfo}>
            <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.gridDetails}>{item.year}</Text>
            {item.price && (
              <Text style={styles.gridPrice}>${item.price.toFixed(2)}</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.listCard}
        onPress={() => router.push(`/(collection)/${item.id}`)}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.listImage} />
        ) : (
          <View style={[styles.listImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>NO</Text>
          </View>
        )}
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listDetails}>{item.year} • {item.set}</Text>
          <Text style={styles.listNumber}>#{item.cardNumber}</Text>
        </View>
        {item.price && (
          <View style={styles.listPriceContainer}>
            <Text style={styles.listPrice}>${item.price.toFixed(2)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{filteredCards.length}</Text>
            <Text style={styles.statLabel}>CARDS</Text>
          </View>
          <View style={[styles.statBox, styles.valueBox]}>
            <Text style={styles.statValue}>${totalValue.toFixed(2)}</Text>
            <Text style={styles.statLabel}>TOTAL VALUE</Text>
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.folderScroll}
        >
          <TouchableOpacity 
            style={[styles.folderChip, !selectedFolder && styles.folderChipActive]}
            onPress={() => setSelectedFolder(null)}
          >
            <Text style={[styles.folderChipText, !selectedFolder && styles.folderChipTextActive]}>
              ALL
            </Text>
          </TouchableOpacity>
          
          {folders.map(folder => (
            <TouchableOpacity 
              key={folder.id}
              style={[styles.folderChip, selectedFolder === folder.id && styles.folderChipActive]}
              onPress={() => setSelectedFolder(folder.id)}
            >
              <Text style={[styles.folderChipText, selectedFolder === folder.id && styles.folderChipTextActive]}>
                {folder.name}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.addFolderChip}
            onPress={() => setShowFolderModal(true)}
          >
            <Text style={styles.addFolderText}>+ FOLDER</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? 
              <List size={20} color="#000000" strokeWidth={3} /> : 
              <Grid size={20} color="#000000" strokeWidth={3} />
            }
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleExport}
          >
            <Download size={20} color="#000000" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={item => item.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {showFolderModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>CREATE FOLDER</Text>
            <TextInput
              style={styles.modalInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="FOLDER NAME"
              placeholderTextColor="#808080"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleCreateFolder}
              >
                <Text style={styles.modalButtonText}>CREATE</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowFolderModal(false);
                  setNewFolderName("");
                }}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  statsContainer: {
    flexDirection: "row",
    padding: 15,
    gap: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#00FF00",
    padding: 15,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  valueBox: {
    backgroundColor: "#FF00FF",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#000000",
    letterSpacing: 0.5,
    marginTop: 5,
  },
  folderScroll: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  folderChip: {
    backgroundColor: "#808080",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  folderChipActive: {
    backgroundColor: "#FFFF00",
  },
  folderChipText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  folderChipTextActive: {
    color: "#000000",
  },
  addFolderChip: {
    backgroundColor: "#FF0000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  addFolderText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: "row",
    paddingHorizontal: 15,
    gap: 10,
  },
  controlButton: {
    backgroundColor: "#00FF00",
    padding: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  listContainer: {
    padding: 15,
  },
  gridCard: {
    flex: 1,
    margin: 7.5,
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  gridImage: {
    width: "100%",
    height: 200,
  },
  gridInfo: {
    padding: 10,
    backgroundColor: "#FFFF00",
  },
  gridName: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  gridDetails: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#000000",
    marginTop: 2,
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#FF0000",
    marginTop: 5,
  },
  listCard: {
    flexDirection: "row",
    backgroundColor: "#000000",
    marginBottom: 15,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  listImage: {
    width: 80,
    height: 110,
  },
  listInfo: {
    flex: 1,
    padding: 15,
    backgroundColor: "#FFFF00",
  },
  listName: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  listDetails: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#000000",
    marginTop: 5,
  },
  listNumber: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#FF0000",
    marginTop: 5,
  },
  listPriceContainer: {
    backgroundColor: "#00FF00",
    padding: 15,
    justifyContent: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#FFFFFF",
  },
  listPrice: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#000000",
  },
  placeholderImage: {
    backgroundColor: "#808080",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "80%",
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#00FF00",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#00FF00",
    padding: 15,
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#000000",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#00FF00",
    padding: 15,
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  modalCancelButton: {
    backgroundColor: "#FF0000",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});