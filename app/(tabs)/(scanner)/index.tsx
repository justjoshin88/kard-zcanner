import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Camera, Upload, RotateCw, ImagePlus, Gauge } from "lucide-react-native";
import { useCards } from "@/hooks/card-store";
import { identifyCard, gradeCard, conditionCard, centeringCard, type ConditionMode } from "@/services/ximilar-api";
import { Card, MarketListing } from "@/types/card";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [frontBase64, setFrontBase64] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [backBase64, setBackBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identifiedCard, setIdentifiedCard] = useState<Card | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ corners?: number; edges?: number; surface?: number; centering?: number; final?: number; condition?: string } | null>(null);
  const [conditionMode, setConditionMode] = useState<ConditionMode>("ebay");
  const [conditionResult, setConditionResult] = useState<{ label?: string; scale_value?: number; max_scale_value?: number; mode?: string } | null>(null);
  const [centeringResult, setCenteringResult] = useState<{ centering?: number; leftRight?: string; topBottom?: string } | null>(null);
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
        setFrontBase64(photo.base64 ?? null);
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
      setFrontBase64(result.assets[0].base64 ?? null);
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
        console.warn("processImage: no card match returned");
        Alert.alert("NO CARD DETECTED", "Try a closer, well-lit front image. Avoid sleeves and fill the frame.");
        setCapturedImage(null);
        setFrontBase64(null);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("ERROR", "FAILED TO IDENTIFY CARD");
      setCapturedImage(null);
      setFrontBase64(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCard = () => {
    if (identifiedCard) {
      const enriched: Card = { ...identifiedCard, backImageUri: backImage ?? undefined };
      addCard(enriched);
      Alert.alert("SUCCESS", "CARD ADDED TO COLLECTION");
      resetScanner();
    }
  };

  const handlePickBackImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.9 });
      if (!res.canceled && res.assets[0]) {
        setBackImage(res.assets[0].uri);
        setBackBase64(res.assets[0].base64 ?? null);
      }
    } catch (e) {
      console.error("handlePickBackImage error", e);
      Alert.alert("ERROR", "FAILED TO PICK BACK IMAGE");
    }
  };

  const handleGrade = async () => {
    if (!frontBase64) {
      Alert.alert("MISSING IMAGE", "CAPTURE OR UPLOAD FRONT IMAGE FIRST");
      return;
    }
    setIsGrading(true);
    setGradeResult(null);
    setConditionResult(null);
    setCenteringResult(null);
    try {
      const [g, c, cen] = await Promise.all([
        gradeCard(frontBase64, backBase64 ?? undefined),
        conditionCard(conditionMode, frontBase64),
        centeringCard(frontBase64),
      ]);
      setGradeResult(g);
      setConditionResult(c);
      setCenteringResult(cen);
    } catch (e) {
      console.error("handleGrade error", e);
      Alert.alert("ERROR", "FAILED TO GRADE CARD");
    } finally {
      setIsGrading(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setFrontBase64(null);
    setBackImage(null);
    setBackBase64(null);
    setIdentifiedCard(null);
    setIsGrading(false);
    setGradeResult(null);
    setConditionResult(null);
    setCenteringResult(null);
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
              {(() => {
                const parts: string[] = [];
                if (identifiedCard.year) parts.push(String(identifiedCard.year));
                if (identifiedCard.set) parts.push(String(identifiedCard.set));
                const details = parts.join(" • ");
                return details.length > 0 ? (
                  <Text style={styles.cardDetails}>{details}</Text>
                ) : null;
              })()}
              {identifiedCard.cardNumber ? (
                <Text style={styles.cardNumber}>#{identifiedCard.cardNumber}</Text>
              ) : null}

              {typeof identifiedCard.price === 'number' && isFinite(identifiedCard.price) ? (
                <View style={styles.priceContainer} testID="price-section">
                  <Text style={styles.priceLabel}>VALUE</Text>
                  <Text style={styles.priceValue}>${identifiedCard.price.toFixed(2)}</Text>
                </View>
              ) : null}

              {Array.isArray(identifiedCard.listings) && identifiedCard.listings.length > 0 ? (
                <View style={styles.listingsBox} testID="listings-section">
                  <Text style={styles.sectionHeader}>MARKET LISTINGS</Text>
                  {identifiedCard.listings.slice(0, 5).map((l, idx) => (
                    <TouchableOpacity
                      key={(l.item_id ?? String(idx)) + String(idx)}
                      style={styles.rowBetween}
                      onPress={() => {
                        if (l.item_link) Linking.openURL(l.item_link).catch(() => Alert.alert('ERROR', 'FAILED TO OPEN LINK')); 
                      }}
                      accessibilityRole="link"
                      testID={`listing-${idx}`}
                    >
                      <Text style={styles.kvKey}>{(l.source ?? 'MARKET').toUpperCase()}</Text>
                      <Text style={styles.kvVal}>
                        {typeof l.price === 'number' ? `${l.price.toFixed(2)}` : '-'} {l.currency ?? ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {identifiedCard.rarity && (
                <View style={styles.rarityBadge}>
                  <Text style={styles.rarityText}>{identifiedCard.rarity}</Text>
                </View>
              )}
            </View>

            <View style={styles.gradingPrep}>
              <Text style={styles.sectionTitle}>IMPROVE GRADING</Text>
              <View style={styles.backRow}>
                <TouchableOpacity style={styles.uploadBackBtn} onPress={handlePickBackImage} testID="upload-back">
                  <ImagePlus size={18} color="#000000" strokeWidth={3} />
                  <Text style={styles.uploadBackText}>{backImage ? "REPLACE BACK IMAGE" : "UPLOAD BACK IMAGE"}</Text>
                </TouchableOpacity>
                {backImage && (
                  <Image source={{ uri: backImage }} style={styles.backThumb} />
                )}
              </View>

              <View style={styles.modeRow}>
                {(["ebay","psa","bgs","sgc","cgc"] as ConditionMode[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    testID={`mode-${m}`}
                    style={[styles.modePill, conditionMode === m && styles.modePillActive]}
                    onPress={() => setConditionMode(m)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modeText, conditionMode === m && styles.modeTextActive]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.gradeButton} onPress={handleGrade} disabled={isGrading} testID="grade-button">
                {isGrading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Gauge size={18} color="#000000" strokeWidth={3} />
                )}
                <Text style={styles.gradeButtonText}>{isGrading ? "GRADING..." : "GRADE"}</Text>
              </TouchableOpacity>
            </View>

            {(gradeResult || conditionResult || centeringResult) && (
              <View style={styles.sectionsContainer}>
                {gradeResult && (
                  <View style={styles.sectionBox} testID="grading-section">
                    <Text style={styles.sectionHeader}>GRADING</Text>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>FINAL</Text><Text style={styles.kvVal}>{gradeResult.final ?? "-"}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>CORNERS</Text><Text style={styles.kvVal}>{gradeResult.corners ?? "-"}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>EDGES</Text><Text style={styles.kvVal}>{gradeResult.edges ?? "-"}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>SURFACE</Text><Text style={styles.kvVal}>{gradeResult.surface ?? "-"}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>CENTERING</Text><Text style={styles.kvVal}>{gradeResult.centering ?? "-"}</Text></View>
                    {gradeResult.condition && (
                      <View style={styles.rowBetween}><Text style={styles.kvKey}>CONDITION</Text><Text style={styles.kvVal}>{gradeResult.condition}</Text></View>
                    )}
                  </View>
                )}

                {conditionResult && (
                  <View style={[styles.sectionBox, styles.sectionAlt]} testID="condition-section">
                    <Text style={styles.sectionHeader}>CONDITION</Text>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>MODE</Text><Text style={styles.kvVal}>{(conditionResult.mode ?? conditionMode).toUpperCase()}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>LABEL</Text><Text style={styles.kvVal}>{conditionResult.label ?? "-"}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>SCORE</Text><Text style={styles.kvVal}>{conditionResult.scale_value ?? "-"} / {conditionResult.max_scale_value ?? "-"}</Text></View>
                  </View>
                )}

                {centeringResult && (
                  <View style={styles.sectionBox} testID="centering-section">
                    <Text style={styles.sectionHeader}>CENTERING</Text>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>GRADE</Text><Text style={styles.kvVal}>{centeringResult.centering ?? "-"}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>L/R</Text><Text style={styles.kvVal}>{centeringResult.leftRight ?? "-"}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.kvKey}>T/B</Text><Text style={styles.kvVal}>{centeringResult.topBottom ?? "-"}</Text></View>
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveCard} testID="save-card">
                <Text style={styles.buttonText}>ADD TO COLLECTION</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={resetScanner} testID="scan-another">
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
      {isProcessing ? (
        <View style={styles.processingContainer}>
          {capturedImage && <Image source={{ uri: capturedImage }} style={styles.processingImage} />}
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

          <View style={[styles.controls, { paddingBottom: 20 + (insets.bottom ?? 0), paddingTop: 20 }]}>
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
    paddingVertical: 0,
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
  gradingPrep: {
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#00FF00",
    marginBottom: 12,
    letterSpacing: 1,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  uploadBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFF00",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  uploadBackText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 0.5,
  },
  backThumb: {
    width: 48,
    height: 48,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  modePillActive: {
    backgroundColor: "#FF00FF",
    borderColor: "#FFFFFF",
  },
  modeText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  modeTextActive: {
    color: "#000000",
  },
  gradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#00FF00",
    padding: 14,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  gradeButtonText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  sectionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  listingsBox: {
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    padding: 14,
    marginTop: 10,
  },
  sectionBox: {
    backgroundColor: "#000000",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    padding: 14,
  },
  sectionAlt: {
    backgroundColor: "#001f3f",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#FFFF00",
    marginBottom: 10,
    letterSpacing: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  kvKey: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 0.5,
  },
  kvVal: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});