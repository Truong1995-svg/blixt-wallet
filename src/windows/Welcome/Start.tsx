import React, { useState } from "react";
import { StyleSheet, StatusBar, NativeModules, SafeAreaView, Platform } from "react-native";
import DialogAndroid from "react-native-dialogs";
import { Text, H1, Button, View, Spinner, Icon } from "native-base";
import { useStoreActions, useStoreState } from "../../state/store";
import * as Animatable from "react-native-animatable";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from "react-native-popup-menu";

import { CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import Container from "../../components/Container";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { PLATFORM } from "../../utils/constants";
import { getStatusBarHeight } from "react-native-status-bar-height";

import { useTranslation } from "react-i18next";
import { languages, namespaces } from "../../i18n/i18n.constants";
import { toast } from "../../utils";
import { Alert } from "../../utils/alert";
import { stopDaemon } from "react-native-turbo-lnd";

interface IAnimatedH1Props {
  children: JSX.Element | string;
}
function AnimatedH1({ children }: IAnimatedH1Props) {
  return (
    <Animatable.View duration={650} animation="fadeInDown">
      <H1 style={style.header}>{children}</H1>
    </Animatable.View>
  );
}

interface IAnimatedViewProps {
  children: JSX.Element[];
}
function AnimatedView({ children }: IAnimatedViewProps) {
  return (
    <Animatable.View duration={660} style={style.buttons} animation="fadeInUp">
      {children}
    </Animatable.View>
  );
}

function TopMenu({ navigation, setCreateWalletLoading }: IStartProps) {
  const t = useTranslation(namespaces.welcome.start).t;
  const torEnabled = useStoreState((store) => store.torEnabled);
  const changeTorEnabled = useStoreActions((store) => store.settings.changeTorEnabled);
  const neutrinoPeers = useStoreState((store) => store.settings.neutrinoPeers);
  const changeNeutrinoPeers = useStoreActions((store) => store.settings.changeNeutrinoPeers);
  const writeConfig = useStoreActions((store) => store.writeConfig);
  const changeLanguage = useStoreActions((store) => store.settings.changeLanguage);
  const currentLanguage = useStoreState((store) => store.settings.language);
  const generateSeed = useStoreActions((store) => store.generateSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions(
    (state) => state.settings.changeScheduledSyncEnabled,
  );

  const onCreateWalletWithPassphrasePress = async () => {
    Alert.alert(
      t("msg.warning", { ns: namespaces.common }),
      `${t("createWallet.msg1")}

      ${t("createWallet.msg2")}

      ${t("createWallet.msg3")}`,
      [
        {
          text: t("createWallet.msg4"),
          onPress: async () => {
            Alert.prompt(t("createWalletWithPassphrase.title"), "", [
              {
                text: t("buttons.cancel", { ns: namespaces.common }),
                style: "cancel",
                onPress: () => {},
              },
              {
                text: t("general.name.dialog.accept", { ns: namespaces.settings.settings }),
                onPress: async (text) => {
                  try {
                    if (!text || text.trim().length === 0) {
                      toast(t("createWalletWithPassphrase.invalidMessage"), undefined, "danger");
                      return;
                    }

                    const hasLeadingTrailingSpaces = text.trim() !== text;

                    if (!!hasLeadingTrailingSpaces) {
                      toast(
                        t("createWalletWithPassphrase.noLeadingTrailingSpaces"),
                        undefined,
                        "danger",
                      );
                      return;
                    }

                    await generateSeed(text.trim());
                    setCreateWalletLoading(true);
                    await createWallet({ init: { aezeedPassphrase: text || undefined } });
                    await setSyncEnabled(true); // TODO test
                    await changeScheduledSyncEnabled(true);

                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: "Loading" }],
                      }),
                    );
                  } catch (error: any) {
                    toast(error.message, undefined, "danger");
                    setCreateWalletLoading(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  const toggleTorEnabled = async () => {
    changeTorEnabled(!torEnabled);
    if (PLATFORM === "android") {
      try {
        await stopDaemon({});
      } catch (e) {
        console.log(e);
      }
      NativeModules.LndMobileTools.restartApp();
    } else {
      const title = "Restart required";
      const message = "Blixt Wallet has to be restarted before the new configuration is applied.";
      Alert.alert(title, message);
    }
  };

  const onSetBitcoinNodePress = async () => {
    Alert.prompt(
      t("bitcoinNetwork.node.setDialog.title", { ns: namespaces.settings.settings }),
      t("bitcoinNetwork.node.setDialog.info", { ns: namespaces.settings.settings }) +
        "\n\n" +
        t("bitcoinNetwork.node.setDialog.leaveBlankToSearch", { ns: namespaces.settings.settings }),
      [
        {
          text: t("buttons.cancel", { ns: namespaces.common }),
          style: "cancel",
          onPress: () => {},
        },
        {
          text: t("bitcoinNetwork.node.setDialog.title", { ns: namespaces.settings.settings }),
          onPress: async (text) => {
            if (text === neutrinoPeers.join(",")) {
              return;
            }

            if (text) {
              const neutrinoPeers = text.split(",").map((n) => n.trim());
              await changeNeutrinoPeers(neutrinoPeers);
            } else {
              await changeNeutrinoPeers([]);
            }
            await writeConfig();

            restartNeeded();
          },
        },
      ],
      "plain-text",
      neutrinoPeers.join(",") ?? "",
    );
  };

  const restartNeeded = () => {
    const title = t("bitcoinNetwork.restartDialog.title", { ns: namespaces.settings.settings });
    const message = t("bitcoinNetwork.restartDialog.msg", { ns: namespaces.settings.settings });
    if (PLATFORM === "android") {
      Alert.alert(
        title,
        message +
          "\n" +
          t("bitcoinNetwork.restartDialog.msg1", { ns: namespaces.settings.settings }),
        [
          {
            style: "cancel",
            text: t("buttons.no", { ns: namespaces.common }),
          },
          {
            style: "default",
            text: t("buttons.yes", { ns: namespaces.common }),
            onPress: async () => {
              try {
                await stopDaemon({});
              } catch (e) {
                console.log(e);
              }
              NativeModules.LndMobileTools.restartApp();
            },
          },
        ],
      );
    } else {
      Alert.alert(title, message);
    }
  };

  const onLanguageChange = async () => {
    if (PLATFORM === "android") {
      const { selectedItem } = await DialogAndroid.showPicker(null, null, {
        positiveText: null,
        negativeText: t("buttons.cancel", { ns: namespaces.common }),
        type: DialogAndroid.listRadio,
        selectedId: currentLanguage,
        items: Object.keys(languages)
          .sort()
          .map((key) => {
            return {
              label: languages[key].name,
              id: languages[key].id,
            };
          }),
      });
      if (selectedItem) {
        await changeLanguage(selectedItem.id);
      }
    } else {
      navigation.navigate("ChangeLanguage", {
        title: t("language.title"),
        data: Object.keys(languages)
          .sort()
          .map((key) => {
            return {
              title: languages[key].name,
              value: languages[key].id,
            };
          }),
        onPick: async (lang: string) => {
          await changeLanguage(lang);
        },
      });
    }
  };

  return (
    <View style={style.menuDotsIcon}>
      <Menu>
        <MenuTrigger>
          <Icon type="Entypo" name="dots-three-horizontal" />
        </MenuTrigger>
        <MenuOptions customStyles={menuOptionsStyles}>
          {PLATFORM !== "macos" && (
            <MenuOption
              onSelect={toggleTorEnabled}
              text={torEnabled ? t("menu.disableTor") : t("menu.enableTor")}
            />
          )}
          <MenuOption onSelect={onSetBitcoinNodePress} text={t("menu.setBitcoinNode")} />
          <MenuOption onSelect={onLanguageChange} text={t("language.title")} />
          <MenuOption
            onSelect={onCreateWalletWithPassphrasePress}
            text={t("menu.createWalletWithPassphrase")}
          />
        </MenuOptions>
      </Menu>
    </View>
  );
}

export interface IStartProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Start">;
  setCreateWalletLoading: (loading: boolean) => void;
}
export default function Start({ navigation }: IStartProps) {
  const t = useTranslation(namespaces.welcome.start).t;
  const generateSeed = useStoreActions((store) => store.generateSeed);
  const createWallet = useStoreActions((store) => store.createWallet);
  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions(
    (state) => state.settings.changeScheduledSyncEnabled,
  );
  const [createWalletLoading, setCreateWalletLoading] = useState(false);

  const onCreateWalletPress = async () => {
    try {
      await generateSeed(undefined);
      Alert.alert(
        t("msg.warning", { ns: namespaces.common }),
        `${t("createWallet.msg1")}

${t("createWallet.msg2")}

${t("createWallet.msg3")}`,
        [
          {
            text: t("createWallet.msg4"),
            onPress: async () => {
              try {
                setCreateWalletLoading(true);
                await createWallet();
                await setSyncEnabled(true); // TODO test
                await changeScheduledSyncEnabled(true);

                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Loading" }],
                  }),
                );
              } catch (error: any) {
                toast(error.message, undefined, "danger");
                setCreateWalletLoading(false);
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert(e.message);
    }
  };

  const onRestoreWalletPress = async () => {
    navigation.navigate("Restore");
  };

  return (
    <Container>
      <SafeAreaView style={style.content}>
        <StatusBar
          backgroundColor="transparent"
          hidden={false}
          translucent={true}
          networkActivityIndicatorVisible={true}
          barStyle="light-content"
        />

        {!createWalletLoading && (
          <TopMenu navigation={navigation} setCreateWalletLoading={setCreateWalletLoading} />
        )}

        {!createWalletLoading ? (
          <AnimatedH1>{t("title")}</AnimatedH1>
        ) : (
          <H1 style={style.header}>{t("title")}</H1>
        )}
        {!createWalletLoading ? (
          <>
            <AnimatedView>
              <Button style={style.button} onPress={onCreateWalletPress}>
                {!createWalletLoading && <Text>{t("createWallet.title")}</Text>}
                {createWalletLoading && <Spinner color={blixtTheme.light} />}
              </Button>
              <Button style={style.button} onPress={onRestoreWalletPress}>
                <Text>{t("restoreWallet.title")}</Text>
              </Button>
            </AnimatedView>
          </>
        ) : (
          <Spinner color={blixtTheme.light} />
        )}
      </SafeAreaView>
    </Container>
  );
}

const iconTopPadding = (StatusBar.currentHeight ?? 0) + getStatusBarHeight(true);

const menuOptionsStyles = {
  optionsContainer: {
    padding: 5,
    borderRadius: 5,
    shadowColor: blixtTheme.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: blixtTheme.light,
  },
  optionWrapper: {
    padding: 5,
  },
  optionText: {
    fontSize: 16,
    color: blixtTheme.dark,
  },
};

const style = StyleSheet.create({
  content: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 38,
    lineHeight: 42,
  },
  buttons: {
    flexDirection: "row",
    alignSelf: "center",
    margin: 10,
  },
  button: {
    margin: 8,
  },
  menuDotsIcon: {
    position: "absolute",
    top: iconTopPadding + 16,
    right: 24,
  },
  languageButton: {
    position: "absolute",
    top: iconTopPadding + 16,
    left: 24,
  },
  icon: {
    fontSize: 22,
    ...Platform.select({
      web: {
        marginRight: 5,
      },
    }),
  },
});
