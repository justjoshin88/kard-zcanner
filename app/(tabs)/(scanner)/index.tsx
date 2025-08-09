import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Camera, Upload, RotateCw } from "lucide-react-native";
import { useCards } from "@/hooks/card-store";
import { identifyCard } from "@/services/ximilar-api";
import { Card } from "@/types/card";

export default function ScannerScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identifiedCard, setIdentifiedCard] = useState<Card | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { addCard } = useCards();

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
      });
      
      if (photo) {
        setCapturedImage(photo.uri);
        await processImage(photo.base64 || "", photo.uri);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      Alert.alert("ERROR", "FAILED TO CAPTURE IMAGE");
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      await processImage(result.assets[0].base64 || "", result.assets[0].uri);
    }
  };

  const processImage = async (base64: string, uri: string) => {
    setIsProcessing(true);
    try {
      const result = await identifyCard(base64);
      
      if (result) {
        const newCard: Card = {
          ...result,
          id: Date.now().toString(),
          imageUri: uri,
          dateAdded: new Date().toISOString(),
          folderId: null,
        };
        
        setIdentifiedCard(newCard);
      } else {
        Alert.alert("NO CARD DETECTED", "TRY ANOTHER IMAGE");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("ERROR", "FAILED TO IDENTIFY CARD");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCard = () => {
    if (identifiedCard) {
      addCard(identifiedCard);
      Alert.alert("SUCCESS", "CARD ADDED TO COLLECTION");
      resetScanner();
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setIdentifiedCard(null);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>CAMERA ACCESS REQUIRED</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.buttonText}>GRANT PERMISSION</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (capturedImage && identifiedCard) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.resultContainer}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
            
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{identifiedCard.name}</Text>
              <Text style={styles.cardDetails}>{identifiedCard.year} • {identifiedCard.set}</Text>
              <Text style={styles.cardNumber}>#{identifiedCard.cardNumber}</Text>
              
              {identifiedCard.price && (
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>VALUE</Text>
                  <Text style={styles.priceValue}>${identifiedCard.price.toFixed(2)}</Text>
                </View>
              )}
              
              {identifiedCard.rarity && (
                <View style={styles.rarityBadge}>
                  <Text style={styles.rarityText}>{identifiedCard.rarity}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveCard}>
                <Text style={styles.buttonText}>ADD TO COLLECTION</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={resetScanner}>
                <Text style={styles.secondaryButtonText}>SCAN ANOTHER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {capturedImage ? (
        <View style={styles.processingContainer}>
          <Image source={{ uri: capturedImage }} style={styles.processingImage} />
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#00FF00" />
            <Text style={styles.processingText}>ANALYZING CARD...</Text>
          </View>
        </View>
      ) : (
        <>
          <CameraView 
            ref={cameraRef}
            style={styles.camera} 
            facing={facing}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame} />
            </View>
          </CameraView>
          
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={handlePickImage}
            >
              <Upload size={28} color="#000000" strokeWidth={3} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]} 
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <Camera size={36} color="#000000" strokeWidth={3} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setFacing(facing === "back" ? "front" : "back")}
            >
              <RotateCw size={28} color="#000000" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#00FF00",
    marginBottom: 30,
    textAlign: "center",
    letterSpacing: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 280,
    height: 400,
    borderWidth: 4,
    borderColor: "#00FF00",
    backgroundColor: "transparent",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#000000",
  },
  controlButton: {
    width: 60,
    height: 60,
    backgroundColor: "#00FF00",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  captureButton: {
    width: 80,
    height: 80,
    backgroundColor: "#FF00FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  processingContainer: {
    flex: 1,
    position: "relative",
  },
  processingImage: {
    flex: 1,
    width: "100%",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
  },
  resultContainer: {
    padding: 20,
  },
  capturedImage: {
    width: "100%",
    height: 400,
    borderWidth: 4,
    borderColor: "#00FF00",
    marginBottom: 20,
  },
  cardInfo: {
    backgroundColor: "#FFFF00",
    padding: 20,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginBottom: 20,
  },
  cardName: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: "#000000",
    marginBottom: 10,
    letterSpacing: 1,
  },
  cardDetails: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#000000",
    marginBottom: 5,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#FF0000",
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000000",
    padding: 15,
    marginTop: 10,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: "#00FF00",
  },
  rarityBadge: {
    backgroundColor: "#FF00FF",
    padding: 10,
    marginTop: 10,
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
  actionButtons: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: "#00FF00",
    padding: 20,
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "#000000",
    padding: 20,
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#00FF00",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 1,
  },
});