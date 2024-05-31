import { StyleSheet, Text, View, useColorScheme } from "react-native";
import React from "react";
import { Colors } from "../../../constants/Colors";
import { useTheme } from "@/components/ThemeContext";
import ThemeSwitch from "@/components/ThemeSwitch";
import { Link } from "expo-router";

const Servers = () => {
  const { theme } = useTheme();
  const backgroundColor =
    theme === "dark" ? Colors.dark.background : Colors.light.background;
  const textColor = theme === "dark" ? Colors.dark.text : Colors.light.text;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>Serveurs</Text>
      <ThemeSwitch />
    </View>
  );
};

export default Servers;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
  },
});
