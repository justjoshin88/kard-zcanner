import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, Filter, X } from "lucide-react-native";
import { useCards } from "@/hooks/card-store";

const SPORTS = ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "MMA", "Pokemon", "Magic The Gathering", "Yu-Gi-Oh!"];
const YEARS = ["2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

export default function SearchScreen() {
  const router = useRouter();
  const { cards } = useCards();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredCards = useMemo(() => {
    let filtered = cards;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(query) ||
        card.set?.toLowerCase().includes(query) ||
        card.cardNumber?.toString().includes(query)
      );
    }

    if (selectedSport) {
      filtered = filtered.filter(card => 
        card.subcategory?.toLowerCase() === selectedSport.toLowerCase()
      );
    }

    if (selectedYear) {
      filtered = filtered.filter(card => 
        card.year?.toString() === selectedYear
      );
    }

    return filtered;
  }, [cards, searchQuery, selectedSport, selectedYear]);

  const clearFilters = () => {
    setSelectedSport(null);
    setSelectedYear(null);
    setSearchQuery("");
  };

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/card-details?id=${item.id}`)}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>NO IMAGE</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDetails}>{item.year} • {item.set}</Text>
        <Text style={styles.cardNumber}>#{item.cardNumber}</Text>
        {item.price && (
          <Text style={styles.cardPrice}>${item.price.toFixed(2)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#808080" strokeWidth={3} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="SEARCH CARDS..."
              placeholderTextColor="#808080"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={20} color="#808080" strokeWidth={3} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? "#000000" : "#FFFFFF"} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <Text style={styles.filterLabel}>SPORT:</Text>
              {SPORTS.map(sport => (
                <TouchableOpacity
                  key={sport}
                  style={[styles.filterChip, selectedSport === sport && styles.filterChipActive]}
                  onPress={() => setSelectedSport(selectedSport === sport ? null : sport)}
                >
                  <Text style={[styles.filterChipText, selectedSport === sport && styles.filterChipTextActive]}>
                    {sport.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <Text style={styles.filterLabel}>YEAR:</Text>
              {YEARS.map(year => (
                <TouchableOpacity
                  key={year}
                  style={[styles.filterChip, selectedYear === year && styles.filterChipActive]}
                  onPress={() => setSelectedYear(selectedYear === year ? null : year)}
                >
                  <Text style={[styles.filterChipText, selectedYear === year && styles.filterChipTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>CLEAR ALL</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredCards.length} RESULTS
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  searchContainer: {
    flexDirection: "row",
    padding: 15,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#00FF00",
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#000000",
  },
  filterButton: {
    backgroundColor: "#FF00FF",
    padding: 12,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#FFFF00",
  },
  filtersContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  filterScroll: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
    marginRight: 15,
    alignSelf: "center",
  },
  filterChip: {
    backgroundColor: "#808080",
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#00FF00",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: "#000000",
  },
  clearButton: {
    backgroundColor: "#FF0000",
    padding: 10,
    alignSelf: "flex-start",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  resultsHeader: {
    paddingHorizontal: 15,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
  },
  listContainer: {
    padding: 15,
  },
  card: {
    flex: 1,
    margin: 7.5,
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  cardImage: {
    width: "100%",
    height: 180,
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
  cardInfo: {
    padding: 10,
    backgroundColor: "#FFFF00",
  },
  cardName: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  cardDetails: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#000000",
    marginTop: 2,
  },
  cardNumber: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#FF0000",
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#FF0000",
    marginTop: 5,
  },
});