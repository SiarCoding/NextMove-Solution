import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TutorialCard from '../tutorials/TutorialCard';
import { type Tutorial } from '@db/schema';

export function TutorialList() {
  const queryClient = useQueryClient();

  const { data: tutorials, isLoading } = useQuery<(Tutorial & { completed?: boolean })[]>({
    queryKey: ['tutorials'],
    queryFn: async () => {
      const response = await fetch('/api/tutorials');
      if (!response.ok) {
        throw new Error('Failed to fetch tutorials');
      }
      return response.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (tutorialId: number) => {
      const response = await fetch(`/api/tutorials/${tutorialId}/complete`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to mark tutorial as completed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
    },
  });

  if (isLoading) {
    return <div>Lädt Tutorials...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tutorials?.map((tutorial) => (
        <TutorialCard
          key={tutorial.id}
          tutorial={tutorial}
          onComplete={(tutorialId) => completeMutation.mutate(tutorialId)}
        />
      ))}
    </div>
  );
}
