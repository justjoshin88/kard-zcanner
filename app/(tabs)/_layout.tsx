import { Tabs } from "expo-router";
import { Camera, FolderOpen, Share2 } from "lucide-react-native";
import React from "react";

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
        name="(share)"
        options={{
          title: "SHARE",
          tabBarIcon: ({ color }) => <Share2 size={24} color={color} strokeWidth={3} />,
        }}
      />
    </Tabs>
  );
}