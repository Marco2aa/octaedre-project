import React, { useEffect, useLayoutEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { useTheme } from "@/components/ThemeContext";
import axios from "axios";

const ServerDetail: React.FC = () => {
  type Port = {
    id_port: string;
    port: string;
  };

  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [ports, setPorts] = useState<Port[]>([]);

  const getPortsByServer = async () => {
    try {
      const response = await axios.get(`http://192.168.1.94:8000/ports/${id}`);
      console.log(response.data);
      setPorts(response.data);
    } catch (error) {
      console.error(
        "Erreur lors de la recuperation des ports du serveur",
        error
      );
    }
  };

  useEffect(() => {
    getPortsByServer();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Server Details - ${id}`,
      headerStyle: {
        backgroundColor: "orange",
      },
      headerTintColor: "black",
      headerTitleStyle: {
        fontWeight: "bold",
      },
      headerRight: () => <MaterialIcons name="radar" size={34} color="black" />,
    });
  }, [navigation, id]);

  const { theme } = useTheme();

  const backgroundColor =
    theme === "dark" ? Colors.dark.background : Colors.light.background;
  const textColor = theme === "dark" ? Colors.dark.text : Colors.light.text;

  const renderItem = ({ item }: { item: Port }) => (
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
      <Pressable>
        <View>
          <Text style={[styles.text, { color: textColor }]}>{item.port}</Text>
        </View>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor }]}>
      <FlatList
        data={ports}
        keyExtractor={(item) => item.id_port}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        horizontal={true}
      />
    </View>
  );
};

export default ServerDetail;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  containerItem: {
    borderRadius: 8,
    margin: 10,
    padding: 10,
    width: 250,
    height: 150, // Limite la hauteur des éléments de la liste
    justifyContent: "center", // Centrer le contenu verticalement
  },
  itemContent: {
    flex: 1,
    justifyContent: "space-around", // Distribue l'espace entre les éléments enfants
  },
  text: {
    fontSize: 18,
  },
  list: {
    paddingBottom: 30,
    marginBottom: 80,
  },
});
