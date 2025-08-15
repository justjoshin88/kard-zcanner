import { Tabs } from "expo-router";
import { Camera, FolderOpen, Search } from "lucide-react-native";
import React from "react";
import { Image, StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopWidth: 4,
          borderTopColor: "#00FF00",
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#00FF00",
        tabBarInactiveTintColor: "#808080",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "900" as const,
          letterSpacing: 0.5,
          textTransform: "uppercase" as const,
        },
      }}
    >
      <Tabs.Screen
        name="(scanner)"
        options={{
          title: "SCAN",
          tabBarIcon: ({ color }) => <Camera size={24} color={color} strokeWidth={3} />,
        }}
      />
      <Tabs.Screen
        name="(collection)"
        options={{
          title: "COLLECTION",
          tabBarIcon: ({ color }) => <FolderOpen size={24} color={color} strokeWidth={3} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "SEARCH",
          tabBarIcon: ({ color }) => <Search size={24} color={color} strokeWidth={3} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "SETTINGS",
          tabBarIcon: () => (
            <Image
              testID="brand-tab-icon"
              source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/w48amyklrmna2qkdbzolp" }}
              style={styles.brandIcon}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});