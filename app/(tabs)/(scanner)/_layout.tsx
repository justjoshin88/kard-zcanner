import { Stack } from "expo-router";

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
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "CARD SCANNER",
        }} 
      />
    </Stack>
  );
}