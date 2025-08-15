import { Stack } from "expo-router";
import React from "react";
import { Image, StyleSheet } from "react-native";

export default function ScannerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#000000",
        },
        headerTintColor: "#00FF00",
        headerTitleStyle: {
          fontWeight: "900" as const,
          fontSize: 20,
          letterSpacing: 1,
        },
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerTitle: () => (
            <Image
              testID="brand-header-logo"
              source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/w48amyklrmna2qkdbzolp" }}
              style={styles.logo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ),
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});