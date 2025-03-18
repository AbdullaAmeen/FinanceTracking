import React, {useEffect, useState} from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {baseUrl} from '../utils/constants';

type DataItem = {
  date: Date | null;
  amount: number | null;
  expenditure: string;
  category: string;
  spendType: string;
  isWeekend: boolean;
};

type SectionData = {
  title: string; // Month and year, e.g., "July 2024"
  data: DataItem[]; // Data items for that month
};

const HomeScreen: React.FC = ({navigation}: any) => {
  const [data, setData] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(baseUrl + '/exec');
        const json = await response.json();
        const parsedData: DataItem[] = json.map((item: any) => ({
          date: item.date ? new Date(item.date) : null,
          amount: item.amount ? parseFloat(item.amount) : null,
          expenditure: item.expenditure || '',
          category: item.category || '',
          spendType: item.spendType || '',
          isWeekend: item.isWeekend || false,
        }));

        // Group data by month
        const groupedData: {[key: string]: DataItem[]} = {};
        parsedData.forEach(item => {
          if (item.date) {
            const monthYear = `${item.date.toLocaleString('default', {
              month: 'long',
            })} ${item.date.getFullYear()}`;
            if (!groupedData[monthYear]) {
              groupedData[monthYear] = [];
            }
            groupedData[monthYear].push(item);
          }
        });

        // Convert to SectionList format
        const sectionData: SectionData[] = Object.keys(groupedData)
          .map(key => ({
            title: key,
            data: groupedData[key].reverse(),
          }))
          .reverse();

        setData(sectionData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddExpense = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={data}
        keyExtractor={(_, index) => index.toString()}
        renderSectionHeader={({section: {title}}) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.title}>Expenditure: {item.expenditure}</Text>
            <Text style={styles.text}>
              Date: {item.date?.toDateString() || 'N/A'}
            </Text>
            <Text style={styles.text}>
              Amount: ₹{item.amount?.toFixed(2) || 'N/A'}
            </Text>
            <Text style={styles.text}>Category: {item.category}</Text>
            <Text style={styles.text}>Spend Type: {item.spendType}</Text>
            <Text style={styles.text}>
              Weekend: {item.isWeekend ? 'Yes' : 'No'}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No data available</Text>
        }
      />
      <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
        <Text style={styles.addButtonText}>+ Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#EEE',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  text: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    margin: 16,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
