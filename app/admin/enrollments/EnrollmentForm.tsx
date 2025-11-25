import React, { useState, useEffect } from 'react';
import { db } from '@/utils/db';
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
  onEnroll: (userId: string, planId: string, memberNumber: string) => void;
}

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ users, plans, onEnroll }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [memberNumber, setMemberNumber] = useState<string>('');

  const handleEnroll = async () => {
    if (!selectedUser || !selectedPlan || !memberNumber) {
      alert('Please select user, plan, and enter member number.');
      return;
    }
    if (!navigator.onLine) {
      await db.enrollments.add({
        userId: selectedUser,
        planId: selectedPlan,
        memberNumber,
        synced: false,
      });
      alert('You are offline. Enrollment saved locally and will sync when online.');
      return;
    }
    onEnroll(selectedUser, selectedPlan, memberNumber);
  };

  // Sync logic (run when online)
  useEffect(() => {
    const syncEnrollments = async () => {
      if (navigator.onLine) {
        const unsynced = await db.enrollments.filter(e => e.synced === false).toArray();
        for (const enrollment of unsynced) {
          await onEnroll(enrollment.userId, enrollment.planId, enrollment.memberNumber);
          if (typeof enrollment.id === 'number') {
            await db.enrollments.update(enrollment.id, { synced: true });
          }
        }
      }
    };
    window.addEventListener('online', syncEnrollments);
    syncEnrollments();
    return () => window.removeEventListener('online', syncEnrollments);
  }, []);

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
      <Input
        type="text"
        placeholder="Enter member number (customer's choice)"
        value={memberNumber}
        onChange={e => setMemberNumber(e.target.value)}
      />
      <Button onClick={handleEnroll}>
        Enroll Customer
      </Button>
    </div>
  );
};

export default EnrollmentForm;
