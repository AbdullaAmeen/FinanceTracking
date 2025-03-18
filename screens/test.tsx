import React, {useEffect, useState} from 'react';
import {View, TextInput, Text, StyleSheet, Button, Alert} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import {baseUrl} from '../utils/constants';

interface DropdownItem {
  label: string;
  value: string;
}

const formatDateToMMDDYYYY = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return ${month}/${day}/${year};
};

const AddExpenseScreen: React.FC = ({navigation}: any) => {
  const [date, setDate] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [expenditure, setExpenditure] = useState('');
  const [isWeekend, setIsWeekend] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const [openType, setOneType] = useState(false);
  const [spendType, setSpendType] = useState(null);
  const [spendTypeLists, setSpendTypeLists] = useState<DropdownItem[]>([
    {label: 'Short Term', value: 'Short Term'},
    {label: 'Mid Term', value: 'Mid Term'},
    {label: 'Long Term', value: 'Long Term'},
  ]);

  const [openCategory, setOpenCategory] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryList, setCategoryList] = useState<DropdownItem[]>([]);

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

  const handleSubmit = () => {
    // Validating form inputs
    if (!date || !amount || !expenditure || !category || !spendType) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const day = date.getDay(); // Get the day of the week (0 = Sunday, 6 = Saturday)
    setIsWeekend(day === 0 || day === 6);
    const dateString = formatDateToMMDDYYYY(date);
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
          <View style={styles.switchContainer}>
            <Button
              title="View List"
              onPress={() => navigation.navigate('Home')}
            />
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  switchContainer: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: 'red',
  },
  selectedText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30, // to ensure the text is not truncated when the dropdown is active
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30, // to ensure the text is not truncated when the dropdown is active
  },
});
export default AddExpenseScreen;