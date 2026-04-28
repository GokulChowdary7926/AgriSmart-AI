describe('agriChatService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('findNearbySellersDealers falls back to non-geo query and computes distance', async () => {
    const findById = jest.fn().mockResolvedValue({
      _id: 'u1',
      name: 'Farmer One',
      farmerProfile: {
        location: {
          coordinates: [78.4867, 17.385]
        }
      }
    });

    const geoChain = {
      limit: jest.fn(() => ({
        select: jest.fn(() => ({
          lean: jest.fn().mockRejectedValue(new Error('geo index missing'))
        }))
      }))
    };

    const fallbackUsers = [
      {
        _id: 'u2',
        name: 'Dealer A',
        role: 'dealer',
        farmerProfile: {
          location: { coordinates: [78.5, 17.4] }
        }
      }
    ];

    const fallbackChain = {
      limit: jest.fn(() => ({
        select: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue(fallbackUsers)
        }))
      }))
    };

    const find = jest
      .fn()
      .mockReturnValueOnce(geoChain)
      .mockReturnValueOnce(fallbackChain);

    jest.doMock('../../models/User', () => ({
      findById,
      find
    }));
    jest.doMock('../../models/Conversation', () => ({}));
    jest.doMock('../../models/Message', () => ({}));

    const service = require('../../services/agriChatService');
    const result = await service.findNearbySellersDealers('u1', 50000, 10);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Dealer A');
    expect(result[0].distance).not.toBeNull();
  });

  test('getDefaultCoordinatesForState returns known and fallback coordinates', () => {
    jest.doMock('../../models/User', () => ({}));
    jest.doMock('../../models/Conversation', () => ({}));
    jest.doMock('../../models/Message', () => ({}));
    const service = require('../../services/agriChatService');

    expect(service.getDefaultCoordinatesForState('Punjab')).toEqual([75.3412, 30.7333]);
    expect(service.getDefaultCoordinatesForState('Unknown')).toEqual([77.2090, 28.6139]);
  });

  test('getUserConversations maps other participant and unread count', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'c1',
          participants: [
            { _id: 'u1', name: 'Self' },
            { _id: 'u2', name: 'Seller B' }
          ],
          unreadCount: [{ user: 'u1', count: 3 }]
        }
      ])
    };

    jest.doMock('../../models/Conversation', () => ({
      find: jest.fn(() => chain)
    }));
    jest.doMock('../../models/User', () => ({}));
    jest.doMock('../../models/Message', () => ({}));

    const service = require('../../services/agriChatService');
    const result = await service.getUserConversations('u1', 20);

    expect(result.length).toBe(1);
    expect(result[0].otherParticipant.name).toBe('Seller B');
    expect(result[0].unreadCount).toBe(3);
  });
});
