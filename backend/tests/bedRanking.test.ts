import { rankBeds } from '../src/services/bedRanking';

describe('bed ranking policy (RH-16)', () => {
  const beds = [
    { id: 'b3', bedNumber: 'B-03', departmentId: 'other' },
    { id: 'b2', bedNumber: 'B-02', departmentId: 'cardiology' },
    { id: 'b1', bedNumber: 'B-01', departmentId: 'cardiology' },
    { id: 'b4', bedNumber: 'A-01', departmentId: 'other' }
  ];

  it('prefers same-department beds, then sorts by bed number', () => {
    expect(rankBeds(beds, 'cardiology').map((bed) => bed.id)).toEqual(['b1', 'b2', 'b4', 'b3']);
  });

  it('uses natural numeric ordering for bed numbers such as A-2 before A-10', () => {
    const numberedBeds = [
      { id: 'ten', bedNumber: 'A-10', departmentId: 'cardiology' },
      { id: 'two', bedNumber: 'A-2', departmentId: 'cardiology' }
    ];
    expect(rankBeds(numberedBeds, 'cardiology').map((bed) => bed.id)).toEqual(['two', 'ten']);
  });

  it('does not mutate the input array', () => {
    const originalOrder = beds.map((bed) => bed.id);
    rankBeds(beds, 'cardiology');
    expect(beds.map((bed) => bed.id)).toEqual(originalOrder);
  });

  it('falls back to bed-number ordering when no bed is in the patient department', () => {
    expect(rankBeds(beds, 'neurology').map((bed) => bed.id)).toEqual(['b4', 'b1', 'b2', 'b3']);
  });
});
