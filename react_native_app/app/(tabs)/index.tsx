import {
  Alert,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Colors } from "../../constants/Colors";
import { useTheme } from "@/components/ThemeContext";
import axios from "axios";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  useBottomSheetModal,
} from "@gorhom/bottom-sheet";

const Index = () => {
  type Server = {
    id: string;
    url: string;
    nom: string;
    protocole: string;
    qualite_signal: string;
    mode_connexion: string;
    domain: boolean;
    verify_ssl: boolean;
    method: string;
  };

  const [servers, setServers] = useState<Server[]>([]);
  const snapPoints = useMemo(() => ["25%", "50%", "75%"], []);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [portsMap, setPortsMap] = useState<{ [key: string]: string }>({});
  const getServers = async () => {
    try {
      const response = await axios.get<Server[]>(
        "http://192.168.1.94:8000/urls"
      );
      const fetchedServers = response.data;
      const portPromises = fetchedServers.map(async (server) => {
        try {
          const response = await axios.get(
            `http://192.168.1.94:8000/number-of-ports/${server.id}`
          );
          const numberOfPorts = response.data;
          return { id: server.id, numberOfPorts };
        } catch (error) {
          console.error(
            "Erreur lors de la récupération du nombre de ports pour le serveur",
            server.id,
            error
          );
          return null;
        }
      });
      const resolvedPorts = await Promise.all(portPromises);
      const validPorts = resolvedPorts.filter(
        (port): port is { id: string; numberOfPorts: string } => port !== null
      );
      const portsMap = validPorts.reduce<{ [key: string]: string }>(
        (acc, port) => {
          acc[port.id] = port.numberOfPorts;
          return acc;
        },
        {}
      );
      setServers(fetchedServers);
      setPortsMap(portsMap);
    } catch (error) {
      console.error("Erreur lors de la récupération des serveurs", error);
    }
  };

  const deleteServerById = async (id: string) => {
    try {
      const response = await axios.delete(
        `http://192.168.1.94:8000/delete-url/${id}`,
        {
          headers: {
            accept: "application/json",
          },
        }
      );
      console.log(response.data);
    } catch (error) {
      console.error("Erreur lors de la suppresion de l'élément", error);
    }
  };

  useEffect(() => {
    getServers();
  }, []);

  const { theme } = useTheme();

  const backgroundColor =
    theme === "dark" ? Colors.dark.background : Colors.light.background;
  const textColor = theme === "dark" ? Colors.dark.text : Colors.light.text;

  const handleLongPress = (id: string) => {
    Alert.alert(
      "Confirmation",
      "Êtes-vous sûr de vouloir supprimer cet élément ?",
      [
        {
          text: "Annuler",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "Supprimer",
          onPress: () => deleteServerById(id),
        },
      ],
      { cancelable: false }
    );
  };

  const renderItem = ({ item }: { item: Server }) => (
    <View
      style={[
        styles.containerItem,
        {
          backgroundColor:
            theme === "dark"
              ? Colors.dark.itemcontainer
              : Colors.light.itemcontainer,
        },
      ]}
    >
      <Pressable
        onLongPress={() => handleLongPress(item.id)}
        onPress={() =>
          router.push({
            pathname: "/Serveurs/[id]",
            params: { id: item.id },
          })
        }
      >
        <View style={styles.itemContent}>
          <Text style={[styles.text, { color: textColor }]}>{item.url}</Text>

          <Text style={[styles.text, { color: textColor }]}>{item.nom}</Text>
          <Text style={[styles.text, { color: textColor }]}>
            {item.protocole}
          </Text>
          <Text style={[styles.text, { color: textColor }]}>
            {item.qualite_signal}
          </Text>
          <Text style={[styles.text, { color: textColor }]}>
            {item.mode_connexion}
          </Text>
          <Text style={[styles.text, { color: textColor }]}>
            {item.verify_ssl}
          </Text>
          <Text style={[styles.text, { color: textColor }]}>{item.domain}</Text>
          <Text style={[styles.text, { color: textColor }]}>{item.method}</Text>
          <Text style={[styles.text, { color: textColor }]}>
            Nombre de ports à l'écoute :{portsMap[item.id]}
          </Text>
          <Text style={[styles.text, { color: textColor }]}>
            Jeudi 23 Mai 2024
          </Text>
        </View>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor }]}>
      <FlatList
        data={servers}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    alignItems: "center",
  },
  containerItem: {
    borderRadius: 8,
    margin: 10,
    padding: 10,
    width: 300,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
    justifyContent: "space-around",
  },
  text: {
    fontSize: 18,
  },
  list: {
    paddingBottom: 30,
    marginBottom: 80,
  },
});
