import React, {useEffect, useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Button,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import SmsAndroid from 'react-native-get-sms-android';
import {baseUrl} from '../utils/constants';

type TransactionDetails = {
  amount: string;
  date: string;
};

const requestSmsPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission',
        message:
          'This app requires access to your SMS to fetch transaction details.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
};

const extractTransactionDetails = (
  message: string,
): TransactionDetails | null => {
  const regex =
    /A\/c\sX\d+\s(credited|debited)\sRs\.(\d+(?:\.\d{1,2})?)\s(\d{1,2}[A-Za-z]{3}\d{2})/;
  const match = message.match(regex);

  if (match) {
    const [, type, amount, date] = match;
    const sign = type === 'debited' ? '+' : '-';
    return {amount: sign + amount, date};
  }
  return null;
};

const fetchTransactionsFromDate = async (
  targetDate: Date,
  setAmount: React.Dispatch<React.SetStateAction<string>>,
  setDate: React.Dispatch<React.SetStateAction<Date>>,
) => {
  const hasPermission = await requestSmsPermission();
  if (!hasPermission) {
    Alert.alert(
      'Permission Denied',
      'SMS read permission is required to fetch transactions.',
    );
    return;
  }

  SmsAndroid.list(
    JSON.stringify({box: 'inbox', maxCount: 100}),
    (fail: string) => console.error('Failed to get SMS:', fail),
    (count: number, smsList: string) => {
      const messages: {body: string}[] = JSON.parse(smsList);
      for (const msg of messages) {
        const details = extractTransactionDetails(msg.body);
        if (details && new Date(details.date) >= targetDate) {
          setAmount(details.amount);
          setDate(new Date(details.date));
          return;
        }
      }
    },
  );
};

const AddExpenseScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [isDatePickerVisible, setDatePickerVisibility] =
    useState<boolean>(false);
  const [isFetchDatePickerVisible, setFetchDatePickerVisibility] =
    useState<boolean>(false);

  const handleFetchTransactions = (selectedDate: Date) => {
    setFetchDatePickerVisibility(false);
    fetchTransactionsFromDate(selectedDate, setAmount, setDate);
  };

  const handleSubmit = () => {
    if (!amount || !date) {
      Alert.alert('Error', 'No transaction detected');
      return;
    }
    const formattedDate = date.toLocaleDateString('en-US');
    fetch(baseUrl + '/exec', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({date: formattedDate, amount}),
    })
      .then(() => Alert.alert('Success', 'Expense added'))
      .catch(() => Alert.alert('Error', 'Failed to add expense'));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Expense</Text>
      <Button
        title="Get SMS Transactions"
        onPress={() => setFetchDatePickerVisibility(true)}
      />
      <DateTimePickerModal
        isVisible={isFetchDatePickerVisible}
        mode="date"
        onConfirm={handleFetchTransactions}
        onCancel={() => setFetchDatePickerVisibility(false)}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={amount}
        editable={false}
      />
      <Text style={styles.label} onPress={() => setDatePickerVisibility(true)}>
        {date.toDateString()}
      </Text>
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(d: Date) => {
          setDate(d);
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
      />
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {fontSize: 24, marginBottom: 20, color: '#333'},
  input: {
    width: '100%',
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 10,
  },
  label: {fontSize: 16, marginBottom: 5, color: 'blue'},
});

export default AddExpenseScreen;
