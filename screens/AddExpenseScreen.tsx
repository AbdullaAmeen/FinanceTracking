import React, {useEffect, useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Button,
  Alert,
  Modal,
  PermissionsAndroid,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import SmsAndroid from 'react-native-get-sms-android';
import {baseUrl} from '../utils/constants';
import moment from 'moment';

interface DropdownItem {
  label: string;
  value: string;
}

function convertToDate(dateStr: string): Date {
  return moment(dateStr, 'DDMMMYY').toDate();
}
type TransactionDetails = {
  amount: string;
  date: string;
  counterparty: string;
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
    /Dear.*User.*X9310.*(credited|debited).*\s(\d+(?:\.\d{1,2})?).*(\d{2}[A-Za-z]{3}\d{2}).*\sto\s([a-zA-z\s]*)\sRefno.*SBI/i;
  const match = message.match(regex);
  if (match) {
    const [, type, amount, date, counterparty] = match;
    const sign = type === 'debited' ? '' : '-';

    return {amount: sign + amount, date, counterparty};
  }
  return null;
};

const AddExpenseScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [chosenTransaction, setChosenTransaction] = useState<Number | null>(
    null,
  );
  const [expenditure, setExpenditure] = useState('');
  const [isWeekend, setIsWeekend] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [openType, setOneType] = useState(false);
  const [spendType, setSpendType] = useState('Short Term');
  const [spendTypeLists, setSpendTypeLists] = useState<DropdownItem[]>([
    {label: 'Short Term', value: 'Short Term'},
    {label: 'Mid Term', value: 'Mid Term'},
    {label: 'Long Term', value: 'Long Term'},
  ]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryList, setCategoryList] = useState<DropdownItem[]>([]);
  const [fetchDate, setFetchDate] = useState<Date | null>(null);
  const [smsTransactions, setSmsTransactions] = useState<
    {id: Number; amount: string; date: Date; counterparty: string}[]
  >([]);

  const [isDatePickerVisible, setDatePickerVisibility] =
    useState<boolean>(false);
  const [isFetchDatePickerVisible, setFetchDatePickerVisibility] =
    useState<boolean>(false);

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
        // console.log(
        //   extractTransactionDetails(
        //     'Dear UPI user A/C X9310 debited by 75.0 on date 15Mar25 trf to NUR AHMED BARBHU Refno 507482229505. If not u? call 1800111109. -SBI',
        //   ),
        // );
        let transactions = [];
        let i = 0;
        setChosenTransaction(null);
        for (const msg of messages) {
          const details = extractTransactionDetails(msg.body);
          if (details) {
            console.log('dateRaw', details.date);
            const dateObject = convertToDate(details.date);
            const targetWithoutTime = moment(targetDate)
              .startOf('day')
              .toDate();
            console.log(dateObject, targetWithoutTime);
            if (dateObject >= targetWithoutTime) {
              transactions.push({
                id: i,
                amount: details.amount,
                date: dateObject,
                counterparty: details.counterparty,
              });
              i++;
            }
          }
        }

        if (transactions.length > 0) {
          setSmsTransactions(transactions);
          setModalVisible(true);
        } else {
          Alert.alert(
            'No Transactions',
            'No recent transaction messages found.',
          );
        }
      },
    );
  };

  const handleFetchTransactions = (selectedDate: Date) => {
    setFetchDate(selectedDate);
    setFetchDatePickerVisibility(false);
    fetchTransactionsFromDate(selectedDate, setAmount, setDate);
  };

  const handleSubmit = () => {
    // Validating form inputs
    if (!date || !amount || !category || !spendType) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!expenditure) {
      setExpenditure(category);
    }
    const dateLocal = moment.utc(date).local(); // Ensure local interpretation
    setIsWeekend(dateLocal.day() === 6 || dateLocal.day() === 0);

    const dateString = moment(date).format('MM/DD/YYYY');
    // Submit data to the server
    fetch(baseUrl + '/exec', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        date: dateString,
        amount,
        expenditure,
        category,
        spendType,
        isWeekend: isWeekend ? 'TRUE' : 'FALSE',
      }),
    })
      .then(response => response.text())
      .then(result => {
        console.log('YEs');
        if (smsTransactions.length > 0 && chosenTransaction != null)
          setSmsTransactions(
            smsTransactions.filter(item => item.id != chosenTransaction),
          );
        Alert.alert('Success', 'Expense added successfully'); // Go back to the previous screen
      })
      .catch(error => {
        console.error('Error:', error);
        Alert.alert('Error', 'Failed to add expense');
      });
  };

  const fetchTypes = async (): Promise<DropdownItem[]> => {
    try {
      const response = await fetch(baseUrl + '/exec?getTypes=true');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: string[] = await response.json(); // Assuming the API returns a JSON array of strings

      return data.map(item => ({
        label: item,
        value: item,
      }));
    } catch (error) {
      console.error('Failed to fetch types:', error);
      throw error;
    }
  };

  useEffect(() => {
    const getCategories = async () => {
      try {
        const result = await fetchTypes();
        setCategoryList(result);
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to load categories. Please try again later.',
        );
      } finally {
        setLoading(false);
      }
    };

    getCategories();
  }, []);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    setDate(date);
    hideDatePicker();
  };

  const smsTransactionButtonPress = () => {
    if (fetchDate != null) {
      if (smsTransactions.length > 0) {
        setModalVisible(true);
      } else {
        handleFetchTransactions(fetchDate);
      }
    } else {
      setFetchDatePickerVisibility(true);
    }
  };

  return (
    <>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>Add Expense</Text>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.selectedText} onPress={() => showDatePicker()}>
            {date.toDateString()}
          </Text>
          <DropDownPicker
            open={openType}
            value={spendType}
            items={spendTypeLists}
            setOpen={setOneType}
            setValue={setSpendType}
            setItems={setSpendTypeLists}
            placeholder={'Choose a Spend Type'}
            style={styles.input}
          />

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
          />

          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor="#444444"
          />
          <TextInput
            style={styles.input}
            placeholder="Expenditure"
            value={expenditure}
            onChangeText={setExpenditure}
            placeholderTextColor="#444444"
          />

          <DropDownPicker
            open={openCategory}
            value={category}
            items={categoryList}
            setOpen={setOpenCategory}
            setValue={setCategory}
            setItems={setCategoryList}
            placeholder={'Choose a Category'}
          />

          <Button title="Submit" onPress={handleSubmit} />
          <DateTimePickerModal
            isVisible={isFetchDatePickerVisible}
            mode="date"
            onConfirm={handleFetchTransactions}
            onCancel={() => setFetchDatePickerVisibility(false)}
          />
          <View style={styles.switchContainer}>
            <Button
              title="Get SMS Transactions"
              onPress={() => smsTransactionButtonPress()}
            />
          </View>
          {fetchDate != null ? (
            <Text
              style={styles.selectedText}
              onPress={() => setFetchDatePickerVisibility(true)}>
              {fetchDate.toDateString()}
            </Text>
          ) : (
            <></>
          )}
          <View style={styles.switchContainer}>
            <Button
              title="View List"
              onPress={() => navigation.navigate('Home')}
            />
          </View>
          <Modal visible={isModalVisible} animationType="slide" transparent>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select a Transaction</Text>
                <FlatList
                  data={smsTransactions}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.transactionItem}
                      onPress={event => {
                        setAmount(item.amount);
                        setDate(item.date);
                        setChosenTransaction(item.id);
                        setModalVisible(false);
                      }}>
                      <Text>
                        Amount: {item.amount} | Date: {item.date.toDateString()}{' '}
                        | {item.counterparty}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                <View style={{width: '60%', marginTop: 10}}>
                  <Button
                    title="Close"
                    onPress={() => setModalVisible(false)}
                  />
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </>
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
  dropdownButtonStyle: {
    width: 200,
    height: 50,
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  switchContainer: {
    marginVertical: 10,
  },
  selectedText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer1: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    height: 'auto',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {fontSize: 20, fontWeight: 'bold', marginBottom: 10},
  transactionItem: {padding: 10, borderBottomWidth: 1},
});

export default AddExpenseScreen;
