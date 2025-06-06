import React, { useState, useLayoutEffect } from "react";
import { Button, Text, View } from "native-base";

import Content from "../../components/Content";
import Container from "../../components/Container";
import { useStoreState, useStoreActions } from "../../state/store";
import {
  getFiles,
  checkResponseIsError,
  downloadFileAsString,
  deleteFile,
} from "../../utils/google-drive";
import { GOOGLE_DRIVE_BACKUP_FILE } from "../../state/GoogleDriveBackup";

export default function GoogleDriveTestbed({ navigation }: any) {
  const pubkey = useStoreState((store) => store.lightning.nodeInfo!.identityPubkey);
  const signIn = useStoreActions((store) => store.google.signIn);
  const signOut = useStoreActions((store) => store.google.signOut);
  const getTokens = useStoreActions((store) => store.google.getTokens);

  const makeBackup = useStoreActions((store) => store.googleDriveBackup.makeBackup);
  const [result, setResult] = useState<string | undefined>(undefined);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Google Drive Testbed",
      headerShown: true,
    });
  }, [navigation]);

  const onPressSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.log(error);
      setResult(JSON.stringify(error));
    }
    setResult("Done");
  };

  const onPressSignOut = async () => {
    await signOut();
    setResult("Done");
  };

  const onPressUpload = async () => {
    try {
      const makeBackupResult = await makeBackup();
      setResult(JSON.stringify(makeBackupResult, null, 2));
    } catch (error) {
      console.log(error);
      setResult(JSON.stringify(error));
    }
  };

  const onPressGetBackupFile = async () => {
    const accessToken = (await getTokens()).accessToken;

    const files = await getFiles(accessToken, [GOOGLE_DRIVE_BACKUP_FILE]);
    if (checkResponseIsError(files)) {
      console.error(files);
      setResult(JSON.stringify(files));
    } else {
      if (files.files.length === 0) {
        setResult(`No file named "${GOOGLE_DRIVE_BACKUP_FILE}" available`);
        return;
      }

      const backupB64 = await downloadFileAsString(accessToken, files.files[0].id);
      if (checkResponseIsError(backupB64)) {
        console.error(backupB64);
        setResult(JSON.stringify(backupB64, null, 2));
      } else {
        console.log("Download succeeded");
        console.log(backupB64);
        setResult(backupB64);
      }
    }
  };

  const onPressList = async () => {
    const accessToken = (await getTokens()).accessToken;
    const files = await getFiles(accessToken);
    setResult(JSON.stringify(files, null, 2));
  };

  const onPressDeleteAll = async () => {
    const accessToken = (await getTokens()).accessToken;

    const files = await getFiles(accessToken);
    if (checkResponseIsError(files)) {
      console.error(files);
    } else {
      for (const file of files.files) {
        console.log(file.id);
        const deleteFileResult = await deleteFile(accessToken, file.id);
        console.log(deleteFileResult);
      }
    }
    setResult("Done");
  };

  const onPressGetTokens = async () => {
    const accessToken = await getTokens();
    console.log(accessToken);
    setResult(JSON.stringify(accessToken, null, 2));
  };

  return (
    <Container>
      <Content>
        <View style={{ width: "100%", display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
          <Button onPress={onPressSignIn}>
            <Text>Sign In</Text>
          </Button>
          <Button onPress={onPressSignOut}>
            <Text>Sign Out</Text>
          </Button>
          <Button onPress={onPressUpload}>
            <Text>Upload File</Text>
          </Button>
          <Button onPress={onPressGetBackupFile}>
            <Text>Get File</Text>
          </Button>
          <Button onPress={onPressList}>
            <Text>List</Text>
          </Button>
          <Button onPress={onPressDeleteAll}>
            <Text>Delete all</Text>
          </Button>
          <Button onPress={onPressGetTokens}>
            <Text>Get tokens</Text>
          </Button>
        </View>
        <View>{result && <Text>{result}</Text>}</View>
      </Content>
    </Container>
  );
}
