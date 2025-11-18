import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Plan {
  _id: string;
  planName: string;
  totalAmount: number;
  monthlyAmount: number;
  duration: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface EnrollmentFormProps {
  users: User[];
  plans: Plan[];
  onEnroll: (userId: string, planId: string) => void;
}

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ users, plans, onEnroll }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const handleEnroll = () => {
    if (!selectedUser || !selectedPlan) {
      alert('Please select both user and plan before enrolling.');
      return;
    }
    onEnroll(selectedUser, selectedPlan);
  };

  return (
    <div className="space-y-4">
      <Select
        value={selectedUser}
        onValueChange={setSelectedUser}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {users.map(user => (
            <SelectItem key={user._id} value={user._id}>
              {user.name} ({user.phone})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={selectedPlan}
        onValueChange={setSelectedPlan}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select plan" />
        </SelectTrigger>
        <SelectContent>
          {plans.map(plan => (
            <SelectItem key={plan._id} value={plan._id}>
              {plan.planName} - ₹{plan.monthlyAmount}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleEnroll}>
        Enroll Customer
      </Button>
    </div>
  );
};

export default EnrollmentForm;
