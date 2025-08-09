import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Trash2, RotateCw, ExternalLink, DollarSign } from "lucide-react-native";
import { useCards } from "@/hooks/card-store";

export default function CardDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { cards, deleteCard } = useCards();
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = new Animated.Value(0);

  const card = cards.find(c => c.id === id);

  if (!card) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>CARD NOT FOUND</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleFlip = () => {
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleDelete = () => {
    Alert.alert(
      "DELETE CARD",
      "ARE YOU SURE YOU WANT TO DELETE THIS CARD?",
      [
        { text: "CANCEL", style: "cancel" },
        { 
          text: "DELETE", 
          style: "destructive",
          onPress: () => {
            deleteCard(card.id);
            router.back();
          }
        }
      ]
    );
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TouchableOpacity onPress={handleFlip} activeOpacity={0.9}>
            <View style={styles.cardContainer}>
              <Animated.View style={[styles.card, frontAnimatedStyle, { backfaceVisibility: "hidden" }]}>
                {card.imageUri ? (
                  <Image source={{ uri: card.imageUri }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>NO IMAGE</Text>
                  </View>
                )}
              </Animated.View>
              
              <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle, { backfaceVisibility: "hidden", position: "absolute" }]}>
                {card.backImageUri ? (
                  <Image source={{ uri: card.backImageUri }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.backPlaceholder]}>
                    <Text style={styles.backText}>CARD BACK</Text>
                    <RotateCw size={40} color="#00FF00" strokeWidth={3} />
                  </View>
                )}
              </Animated.View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
            <RotateCw size={20} color="#000000" strokeWidth={3} />
            <Text style={styles.flipButtonText}>FLIP CARD</Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.cardName}>{card.name}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>YEAR</Text>
                <Text style={styles.detailValue}>{card.year || "N/A"}</Text>
              </View>
              
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>SET</Text>
                <Text style={styles.detailValue}>{card.set || "N/A"}</Text>
              </View>
              
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>NUMBER</Text>
                <Text style={styles.detailValue}>#{card.cardNumber || "N/A"}</Text>
              </View>
              
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>SPORT</Text>
                <Text style={styles.detailValue}>{card.subcategory || "N/A"}</Text>
              </View>
            </View>

            {card.rarity && (
              <View style={styles.rarityContainer}>
                <Text style={styles.rarityLabel}>RARITY</Text>
                <View style={styles.rarityBadge}>
                  <Text style={styles.rarityText}>{card.rarity}</Text>
                </View>
              </View>
            )}

            {card.price && (
              <View style={styles.priceContainer}>
                <DollarSign size={24} color="#000000" strokeWidth={3} />
                <View style={styles.priceInfo}>
                  <Text style={styles.priceLabel}>ESTIMATED VALUE</Text>
                  <Text style={styles.priceValue}>${card.price.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {card.grade && (
              <View style={styles.gradeContainer}>
                <Text style={styles.gradeLabel}>GRADE</Text>
                <Text style={styles.gradeValue}>{card.grade}</Text>
                {card.gradeCompany && (
                  <Text style={styles.gradeCompany}>{card.gradeCompany}</Text>
                )}
              </View>
            )}

            <View style={styles.metaInfo}>
              <Text style={styles.metaLabel}>ADDED ON</Text>
              <Text style={styles.metaValue}>
                {new Date(card.dateAdded).toLocaleDateString()}
              </Text>
            </View>

            {card.links && (
              <View style={styles.linksContainer}>
                <Text style={styles.linksTitle}>EXTERNAL LINKS</Text>
                {Object.entries(card.links).map(([site, url]) => (
                  <TouchableOpacity key={site} style={styles.linkButton}>
                    <ExternalLink size={16} color="#000000" strokeWidth={3} />
                    <Text style={styles.linkText}>{site.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={20} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.deleteButtonText}>DELETE CARD</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#808080",
  },
  content: {
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: "#FF0000",
    letterSpacing: 1,
  },
  cardContainer: {
    height: 400,
    marginBottom: 20,
  },
  card: {
    width: "100%",
    height: "100%",
  },
  cardBack: {
    top: 0,
    left: 0,
    right: 0,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  placeholderImage: {
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
  },
  backPlaceholder: {
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
    marginBottom: 20,
  },
  flipButton: {
    flexDirection: "row",
    backgroundColor: "#00FF00",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginBottom: 20,
    gap: 10,
  },
  flipButtonText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  infoContainer: {
    backgroundColor: "#000000",
    padding: 20,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginBottom: 20,
  },
  cardName: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  detailBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFF00",
    padding: 15,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#000000",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  rarityContainer: {
    marginBottom: 20,
  },
  rarityLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#00FF00",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  rarityBadge: {
    backgroundColor: "#FF00FF",
    padding: 10,
    alignSelf: "flex-start",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  rarityText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  priceContainer: {
    flexDirection: "row",
    backgroundColor: "#00FF00",
    padding: 20,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginBottom: 20,
    alignItems: "center",
    gap: 15,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#000000",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  gradeContainer: {
    backgroundColor: "#FF0000",
    padding: 20,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginBottom: 20,
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  gradeValue: {
    fontSize: 36,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  gradeCompany: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginTop: 5,
  },
  metaInfo: {
    borderTopWidth: 4,
    borderTopColor: "#00FF00",
    paddingTop: 15,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#00FF00",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  linksContainer: {
    marginTop: 20,
    borderTopWidth: 4,
    borderTopColor: "#00FF00",
    paddingTop: 15,
  },
  linksTitle: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
    marginBottom: 10,
  },
  linkButton: {
    flexDirection: "row",
    backgroundColor: "#FFFF00",
    padding: 10,
    marginBottom: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    gap: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#FF0000",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    gap: 10,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});