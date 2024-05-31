import React, { useState, useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { View, Text, Platform, AppState, AppStateStatus } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TouchableOpacity } from "react-native-gesture-handler";
import { BottomSheetModal, useBottomSheetModal } from "@gorhom/bottom-sheet";
import CustomBottomSheetModal from "@/components/CustomBottomSheetModal";
import { Feather } from "@expo/vector-icons";
import { FontAwesome6 } from "@expo/vector-icons";
import { SimpleLineIcons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackNavigatorProps,
} from "react-native-screens/lib/typescript/native-stack/types";
import { FormProvider } from "@/components/FormProvider";
import { useFormContext } from "@/components/FormProvider";
import axios from "axios";

const TIMER_KEY = "TIMER_KEY";
const INITIAL_TIME = 15 * 60;

interface TimerData {
  timeLeft: number;
  timestamp: number;
}

export default function Tablayout() {
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIME);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [lastAppState, setLastAppState] = useState<AppStateStatus>(
    appState.current
  );

  const { formData } = useFormContext();

  const navigation = useNavigation<NativeStackNavigatorProps>();

  const handlePresentModalPress = () => bottomSheetRef.current?.present();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { dismiss } = useBottomSheetModal();
  const lastTimestampRef = useRef<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const loadTimer = async () => {
      try {
        const storedTime = await AsyncStorage.getItem(TIMER_KEY);
        if (storedTime !== null) {
          const currentTime = Math.floor(Date.now() / 1000);
          const savedTime: TimerData = JSON.parse(storedTime);
          const elapsed = currentTime - savedTime.timestamp;
          const remainingTime = savedTime.timeLeft - elapsed;
          setTimeLeft(remainingTime > 0 ? remainingTime : INITIAL_TIME);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadTimer();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prevTimeLeft) => {
        const newTimeLeft = prevTimeLeft > 0 ? prevTimeLeft - 1 : INITIAL_TIME;
        saveTimer(newTimeLeft);
        return newTimeLeft;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const saveTimer = async (timeLeft: number) => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const timerData: TimerData = {
        timeLeft,
        timestamp: currentTime,
      };
      await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(timerData));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    const currentTime = Math.floor(Date.now() / 1000);

    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      const elapsed = currentTime - lastTimestampRef.current;
      setTimeLeft((prevTimeLeft) => {
        const newTimeLeft = prevTimeLeft - elapsed;
        return newTimeLeft > 0 ? newTimeLeft : INITIAL_TIME;
      });
    }

    lastTimestampRef.current = currentTime;
    appState.current = nextAppState;
    setLastAppState(appState.current);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const submitFormData = async () => {
    let url_id: number;
    const completeFormData = {
      url: formData.url,
      nom: formData.servername,
      protocole: formData.protocol,
      qualite_signal: formData.qualite,
      mode_connexion: formData.update,
      domain: formData.isSwitchDomainOn,
      verify_ssl: formData.isSwitchSSLOn,
      method: formData.method,
    };
    try {
      const response = await axios.post(
        "http://192.168.1.94:8000/add-url",
        completeFormData
      );
      const data = response.data;
      console.log(completeFormData);
      console.log(data);
      url_id = data.id;
      console.log(formData.chips);
      if (formData.chips && formData.chips.length > 0) {
        await Promise.all(
          formData.chips.map(async (chip) => {
            const chipData = {
              num_code: chip.label,
            };
            const responseTwo = await axios.post(
              `http://192.168.1.94:8000/add-codehttp/${url_id}`,
              chipData
            );
            const data = responseTwo.data;
            console.log(data);
          })
        );
        navigation.navigate("index");
      }
    } catch (error) {
      console.error('Erreur lors de la creation de l"url ', error);
    }
  };

  return (
    <>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            right: 0,
            left: 0,
            height: 72,
            elevation: 0,
            backgroundColor: "#FCA71A",
          },
        }}
      >
        <Tabs.Screen
          name="addserver"
          options={{
            title: "",
            headerShown: true,
            tabBarStyle: {
              display: "none",
            },
            headerTitle: "Ajoutez un serveur",
            headerTitleAlign: "center",
            headerStyle: {
              backgroundColor: "#FCA71A",
            },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate("index")}
                style={{ marginLeft: 15 }}
              >
                <FontAwesome6 name="arrow-left" size={24} color="black" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={submitFormData}
                style={{ marginRight: 15 }}
              >
                <AntDesign name="circledowno" size={24} color="black" />
              </TouchableOpacity>
            ),
            tabBarIcon: ({ focused }) => {
              return (
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: 10,
                    borderTopColor: focused ? "white" : "rgba(0, 0, 0, 0)",
                    borderTopWidth: 4,
                  }}
                >
                  <FontAwesome6 name="add" size={25} color="black" />
                </View>
              );
            },
          }}
        />
        <Tabs.Screen
          name="Settings/settings"
          options={{
            title: "",
            tabBarIcon: ({ focused }) => {
              return (
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: 10,
                    borderTopColor: focused ? "white" : "rgba(0, 0, 0, 0)",
                    borderTopWidth: 4,
                  }}
                >
                  <Feather name="settings" size={25} color="black" />
                </View>
              );
            },
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "",
            headerShown: true,
            headerTitle: "Nos serveurs",
            headerTitleAlign: "center",
            headerStyle: {
              backgroundColor: "#FCA71A",
            },
            headerRight: () => (
              <TouchableOpacity
                onPress={() => {
                  handlePresentModalPress();
                }}
                style={{ marginRight: 15 }}
              >
                <FontAwesome name="sort-amount-desc" size={24} color="black" />
              </TouchableOpacity>
            ),
            tabBarIcon: ({ focused }) => {
              return (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "orange",
                    width: Platform.OS == "ios" ? 50 : 60,
                    height: Platform.OS == "ios" ? 50 : 60,
                    top: Platform.OS == "ios" ? -10 : -27,
                    borderRadius: Platform.OS == "ios" ? 25 : 30,
                    borderColor: Colors.dark.background,
                    borderStyle: "solid",
                    borderWidth: 4,
                  }}
                >
                  <MaterialCommunityIcons
                    name="home-lightning-bolt-outline"
                    size={25}
                    color="black"
                  />
                  <Text
                    style={{
                      marginTop: 5,
                      fontSize: 20,
                      color: "black",
                      position: "absolute",
                      bottom: -35,
                    }}
                  >
                    {formatTime(timeLeft)}
                  </Text>
                </View>
              );
            },
          }}
        />

        <Tabs.Screen
          name="modal"
          options={{
            title: "",
            tabBarIcon: ({ focused }) => {
              return (
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: 10,
                    borderTopColor: focused ? "white" : "rgba(0, 0, 0, 0)",
                    borderTopWidth: 4,
                  }}
                >
                  <Text>
                    <FontAwesome6 name="bell" size={25} color="black" />
                  </Text>
                </View>
              );
            },
          }}
        />
        <Tabs.Screen
          name="auth/auth"
          options={{
            title: "",
            tabBarIcon: ({ focused }) => {
              return (
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: 10,
                    borderTopColor: focused ? "white" : "rgba(0, 0, 0, 0)",
                    borderTopWidth: 4,
                  }}
                >
                  <SimpleLineIcons name="login" size={25} color="black" />
                </View>
              );
            },
          }}
        />
      </Tabs>
      <CustomBottomSheetModal ref={bottomSheetRef}></CustomBottomSheetModal>
    </>
  );
}
