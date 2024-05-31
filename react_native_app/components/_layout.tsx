import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";

const TabsLayout = () => {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "orange",
          tabBarStyle: { backgroundColor: "orange" },
          headerStyle: { backgroundColor: "orange" },
          headerTintColor: "black",
          headerTitleAlign: "center",
        }}
        initialRouteName="index"
      >
        <Tabs.Screen name="index" options={{ title: "Nos serveurs" }} />
        <Tabs.Screen name="auth/auth" options={{ title: "Auth" }} />
      </Tabs>
    </View>
  );
};

export default TabsLayout;
