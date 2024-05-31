import React from "react";
import { StyleSheet, View } from "react-native";
import { Slot, Stack } from "expo-router";
import { ThemeProvider } from "@/components/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PaperProvider } from "react-native-paper";
import { FormProvider } from "@/components/FormProvider";

const RootLayout = () => {
  return (
    <PaperProvider>
      <FormProvider>
        <GestureHandlerRootView>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <StatusBar hidden={false} />
              <Stack>
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    headerShown: false,
                  }}
                ></Stack.Screen>
              </Stack>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </FormProvider>
    </PaperProvider>
  );
};

export default RootLayout;
