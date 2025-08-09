import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Download, 
  Trash2, 
  Info, 
  HelpCircle, 
  Shield,
  Bell,
  Palette,
  Database
} from "lucide-react-native";
import { useCards } from "@/hooks/card-store";
import { exportToCSV } from "@/utils/export";

export default function SettingsScreen() {
  const { cards, clearAllCards } = useCards();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  const handleExportAll = async () => {
    try {
      await exportToCSV(cards);
      Alert.alert("SUCCESS", `EXPORTED ${cards.length} CARDS TO CSV`);
    } catch {
      Alert.alert("ERROR", "FAILED TO EXPORT COLLECTION");
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "CLEAR ALL CARDS",
      "THIS WILL DELETE ALL CARDS FROM YOUR COLLECTION. THIS CANNOT BE UNDONE.",
      [
        { text: "CANCEL", style: "cancel" },
        { 
          text: "DELETE ALL", 
          style: "destructive",
          onPress: () => {
            clearAllCards();
            Alert.alert("SUCCESS", "ALL CARDS DELETED");
          }
        }
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      "ABOUT",
      "SPORTS CARD COLLECTION MANAGER\\n\\nVersion 1.0.0\\n\\nBuilt with React Native & Expo\\n\\nPowered by Ximilar AI Recognition"
    );
  };

  const showHelp = () => {
    Alert.alert(
      "HELP",
      "HOW TO USE:\\n\\n1. TAP SCAN TO ADD CARDS\\n2. VIEW YOUR COLLECTION\\n3. SEARCH & FILTER CARDS\\n4. SHARE & EXPORT\\n\\nFor support, contact us at support@cardcollector.com"
    );
  };

  const showPrivacy = () => {
    Alert.alert(
      "PRIVACY POLICY",
      "YOUR CARD DATA IS STORED LOCALLY ON YOUR DEVICE. WE DO NOT COLLECT OR SHARE YOUR PERSONAL INFORMATION.\\n\\nCARD IMAGES ARE PROCESSED BY XIMILAR AI FOR IDENTIFICATION PURPOSES ONLY."
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showSwitch = false, 
    switchValue = false, 
    onSwitchChange,
    danger = false 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, danger && styles.dangerItem]} 
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingIcon}>
        {/* eslint-disable-next-line @rork/linters/general-no-raw-text */}
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      {showSwitch && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: "#808080", true: "#00FF00" }}
          thumbColor={switchValue ? "#000000" : "#FFFFFF"}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>{cards.length} CARDS IN COLLECTION</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COLLECTION</Text>
          
          <SettingItem
            icon={<Download size={24} color="#00FF00" strokeWidth={3} />}
            title="EXPORT COLLECTION"
            subtitle="Export all cards to CSV file"
            onPress={handleExportAll}
          />
          
          <SettingItem
            icon={<Trash2 size={24} color="#FF0000" strokeWidth={3} />}
            title="CLEAR ALL CARDS"
            subtitle="Delete all cards from collection"
            onPress={handleClearAll}
            danger
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          
          <SettingItem
            icon={<Bell size={24} color="#FFFF00" strokeWidth={3} />}
            title="NOTIFICATIONS"
            subtitle="Get notified about new features"
            showSwitch
            switchValue={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
          />
          
          <SettingItem
            icon={<Database size={24} color="#FF00FF" strokeWidth={3} />}
            title="AUTO BACKUP"
            subtitle="Automatically backup collection"
            showSwitch
            switchValue={autoBackup}
            onSwitchChange={setAutoBackup}
          />
          
          <SettingItem
            icon={<Palette size={24} color="#00FFFF" strokeWidth={3} />}
            title="THEME"
            subtitle="Neo-Brutalist (Default)"
            onPress={() => Alert.alert("THEME", "More themes coming soon!")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          
          <SettingItem
            icon={<HelpCircle size={24} color="#00FF00" strokeWidth={3} />}
            title="HELP & FAQ"
            subtitle="Learn how to use the app"
            onPress={showHelp}
          />
          
          <SettingItem
            icon={<Shield size={24} color="#FFFF00" strokeWidth={3} />}
            title="PRIVACY POLICY"
            subtitle="How we handle your data"
            onPress={showPrivacy}
          />
          
          <SettingItem
            icon={<Info size={24} color="#FF00FF" strokeWidth={3} />}
            title="ABOUT"
            subtitle="App version and info"
            onPress={showAbout}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            MADE WITH ❤️ FOR CARD COLLECTORS
          </Text>
          <Text style={styles.versionText}>
            VERSION 1.0.0
          </Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#000000",
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#00FF00",
    letterSpacing: 2,
    marginBottom: 10,
  },
  statsContainer: {
    backgroundColor: "#FF00FF",
    padding: 15,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  statsText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
    marginBottom: 15,
    backgroundColor: "#FFFF00",
    padding: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    padding: 20,
    marginBottom: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  dangerItem: {
    borderColor: "#FF0000",
  },
  settingIcon: {
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  dangerText: {
    color: "#FF0000",
  },
  settingSubtitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#808080",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  footer: {
    padding: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#000000",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 10,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#808080",
    letterSpacing: 0.5,
  },
});